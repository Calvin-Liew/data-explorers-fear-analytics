
"""
Hybrid horror screenplay parser: GPT-4o-mini for bulk + GPT-4o for failed chunks
"""

import os
import sys
import time
import json
import re
import argparse
from typing import List, Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import numpy as np
from openai import OpenAI
import jsonschema


def load_env_config():
    """Load environment variables from config.env file"""
    config_file = "config.env"
    if os.path.exists(config_file):
        with open(config_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.lstrip().startswith("#"):
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print(f"Loaded configuration from {config_file}")
    else:
        print(f"Warning: {config_file} not found. Using system environment variables.")

load_env_config()


client = OpenAI()


HORROR_LEXICON = [
    
    "night","dark","blood","scream","fear","death","shadow","creepy","silent","knife",
    "gun","moan","darkness","creak","skull","terror","gasp","cry","weapon","footsteps",
    "whisper","isolated","scary","frightening","grave","slaughter","startled","hell",
    "devil","evil","possessed","quiet","afraid","mirror","scared","bang","witch",
    "paranoid","hunting","demon","monster","secret","screaming","trapped","dead",
    
    
    "alone","follow","following","followed","unseen","hidden","mysterious","strange",
    "weird","odd","unusual","bizarre","sinister","dangerous","threatening","menacing",
    "spooky","haunting","eerie","ominous","fog","foggy","dim","silence","heartbeat",
    "thud","crash","screech","clank","rustle","howl","wail","sob","gasping","shriek",
    "whispering","moaning","groaning","crying","screaming","shrieking",
    
    
    "blade","blades","chainsaw","axe","rope","noose","guns","weapons","sharp","cut",
    "cutting","stab","stabbing","slice","slicing","attack","attacking","threaten",
    "threatening","menace","menacing","violent","brutal","aggressive","hostile",
    
    
    "ghost","ghosts","spirit","spirits","witches","cult","cults","ritual","rituals",
    "curse","cursed","haunted","possession","supernatural","paranormal","satan",
    "hellish","monsters","demons","spirits","witches","cults","rituals","cursed",
    
    
    "basement","attic","asylum","cabin","woods","forest","cemetery","graveyard",
    "abandoned","empty","deserted","remote","underground","tunnel","tunnels",
    "doll","dolls","mask","masks","costume","costumes","mirrors","windows",
    
    
    "panic","panicking","terrified","fearful","dread","dreadful","uneasy","anxious",
    "nervous","worried","disturbed","disturbing","horrifying","terrifying","shocking",
    "shocked","surprised","alarmed","terror","fear","afraid","scared","paranoid",
    
    
    "chase","chasing","hunt","stalk","stalking","pursue","pursuing","lurk","lurking",
    "hide","hiding","escape","escaping","run","running","flee","fleeing","caught",
    "capture","trapped","follow","following","followed","unseen","hidden","mysterious"
]


SCENE_HDR_RE = re.compile(r"^(INT\.|EXT\.|FADE IN|FADE OUT|CUT TO|DISSOLVE TO)", re.IGNORECASE)
SCENE_NUM_RE = re.compile(r"^\s*\d+\s*$")
SCENE_CONTINUED_RE = re.compile(r"^\s*\d+\s+CONTINUED:?\s*$", re.IGNORECASE)


SCENE_SCHEMA = {
    "type": "object",
    "required": ["scene_index","heading","location","time_of_day","characters",
                 "dialogue_stats","action_stats","horror_signals",
                 "tension_score","fear_emotion","sentiment","scene_summary"],
    "properties": {
        "scene_index": {"type":"integer", "minimum":0},
        "heading": {"type":"string"},
        "location": {"type":"string"},
        "time_of_day": {"type":"string"},
        "characters": {"type":"array", "items":{"type":"string"}},
        "dialogue_stats": {
            "type":"object",
            "required": ["lines","words","question_rate","exclamation_rate","avg_line_words"],
            "properties": {
                "lines": {"type":"integer", "minimum":0},
                "words": {"type":"integer", "minimum":0},
                "question_rate": {"type":"number", "minimum":0, "maximum":1},
                "exclamation_rate": {"type":"number", "minimum":0, "maximum":1},
                "avg_line_words": {"type":"number", "minimum":0}
            }
        },
        "action_stats": {
            "type":"object",
            "required": ["words","stage_directions"],
            "properties": {
                "words": {"type":"integer", "minimum":0},
                "stage_directions": {"type":"integer", "minimum":0}
            }
        },
        "horror_signals": {
            "type":"object",
            "properties": {k: {"type":"integer","minimum":0} for k in HORROR_LEXICON}
        },
        "tension_score": {"type":"number","minimum":0,"maximum":1},
        "fear_emotion": {"type":"number","minimum":0,"maximum":1},
        "sentiment": {"type":"number","minimum":-1,"maximum":1},
        "scene_summary":{"type":"string"}
    },
    "additionalProperties": False
}

BATCH_SCHEMA = {
    "type":"object",
    "required":["film_title","scenes"],
    "properties":{
        "film_title":{"type":"string"},
        "scenes":{"type":"array", "items": SCENE_SCHEMA}
    },
    "additionalProperties": False
}


SYSTEM_PROMPT_MINI = """Parse screenplay scenes into JSON. Extract:
- heading, location, time_of_day, characters
- dialogue_stats: lines, words, question_rate, exclamation_rate, avg_line_words
- action_stats: words, stage_directions
- horror_signals: COUNT each horror term (case-insensitive)
- tension_score (0-1), fear_emotion (0-1), sentiment (-1 to 1)
- scene_summary: 1-2 sentences

ONLY OUTPUT VALID JSON MATCHING THE SCHEMA."""

SYSTEM_PROMPT_4O = """You are an expert at parsing screenplay scenes into structured JSON. 

Extract the following for each scene:
- heading, location, time_of_day, characters
- dialogue_stats: lines, words, question_rate, exclamation_rate, avg_line_words
- action_stats: words, stage_directions
- horror_signals: COUNT each horror term (case-insensitive, be thorough)
- tension_score (0-1): suspense/dread intensity
- fear_emotion (0-1): fear level in scene
- sentiment (-1 to 1): emotional valence
- scene_summary: 1-2 sentences of key actions/dialogue/horror

CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no extra text."""

def split_scenes_heuristic(text: str, max_scene_length: int = 2000) -> List[str]:
    """Split screenplay into scenes with better chunking"""
    text = text.replace("\r\n","\n").replace("\r","\n")
    lines = text.split("\n")
    
    scenes = []
    current_scene = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        
        if SCENE_HDR_RE.match(line) or SCENE_NUM_RE.match(line) or SCENE_CONTINUED_RE.match(line):
            
            if current_scene:
                scene_text = "\n".join(current_scene)
                if len(scene_text.split()) > 50:  
                    scenes.append(scene_text)
            current_scene = [line]
        else:
            current_scene.append(line)
    
    
    if current_scene:
        scene_text = "\n".join(current_scene)
        if len(scene_text.split()) > 50:
            scenes.append(scene_text)
    
    
    final_scenes = []
    for scene in scenes:
        words = scene.split()
        if len(words) > max_scene_length:
            truncated = " ".join(words[:max_scene_length]) + "... [TRUNCATED]"
            final_scenes.append(truncated)
        else:
            final_scenes.append(scene)
    
    return final_scenes

def preprocess_scene_chunk(scenes: List[str], max_chunk_size: int = 4) -> List[List[str]]:
    """Preprocess scenes into optimal chunks for GPT processing"""
    chunks = []
    current_chunk = []
    current_tokens = 0
    
    for scene in scenes:
        
        scene_tokens = len(scene) // 4
        
        if current_tokens + scene_tokens > 2000 or len(current_chunk) >= max_chunk_size:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = [scene]
            current_tokens = scene_tokens
        else:
            current_chunk.append(scene)
            current_tokens += scene_tokens
    
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

def call_gpt_with_retry(system_prompt: str, user_prompt: str, schema: dict, 
                       model: str = "gpt-4o-mini", max_retries: int = 2) -> dict:
    """Call GPT with retry logic and JSON cleanup"""
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=1500 if model == "gpt-4o-mini" else 2000,
                temperature=0.0
            )
            
            
            content = response.choices[0].message.content.strip()
            
            
            if not content.startswith('{'):
                start_idx = content.find('{')
                if start_idx != -1:
                    content = content[start_idx:]
            
            if not content.endswith('}'):
                end_idx = content.rfind('}')
                if end_idx != -1:
                    content = content[:end_idx + 1]
            
            result = json.loads(content)
            jsonschema.validate(result, schema)
            return result
            
        except json.JSONDecodeError as e:
            print(f"JSON decode error on attempt {attempt + 1} with {model}: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                raise e
        except Exception as e:
            print(f"Attempt {attempt + 1} failed with {model}: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                raise e

def create_fallback_result(user_prompt: str) -> dict:
    """Create a fallback result when JSON parsing fails"""
    film_title = "Unknown"
    if "Parse these" in user_prompt:
        start = user_prompt.find('"') + 1
        end = user_prompt.find('"', start)
        if start > 0 and end > start:
            film_title = user_prompt[start:end]
    
    scene_count = user_prompt.count("Scene ")
    
    scenes = []
    for i in range(scene_count):
        scenes.append({
            "scene_index": i,
            "heading": f"Scene {i+1}",
            "location": "Unknown",
            "time_of_day": "Unknown",
            "characters": [],
            "dialogue_stats": {"lines": 0, "words": 0, "question_rate": 0.0, "exclamation_rate": 0.0, "avg_line_words": 0.0},
            "action_stats": {"words": 0, "stage_directions": 0},
            "horror_signals": {term: 0 for term in HORROR_LEXICON},
            "tension_score": 0.5,
            "fear_emotion": 0.5,
            "sentiment": 0.0,
            "scene_summary": "Parsing failed - fallback data"
        })
    
    return {
        "film_title": film_title,
        "scenes": scenes
    }

def build_chunk_prompt(film_title: str, scenes: List[str]) -> str:
    """Build optimized prompt for scene chunk"""
    prompt = f"""Parse these {len(scenes)} scenes from "{film_title}" into valid JSON.

HORROR TERMS TO COUNT: {', '.join(HORROR_LEXICON[:30])}...

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no extra text.

Scenes:
"""
    
    for i, scene in enumerate(scenes):
        
        words = scene.split()
        if len(words) > 300:
            scene = " ".join(words[:300]) + "... [TRUNCATED]"
        prompt += f"\nScene {i}:\n{scene}\n"
    
    prompt += f"""

Return ONLY this JSON structure (no other text):
{{
  "film_title": "{film_title}",
  "scenes": [
    {{
      "scene_index": 0,
      "heading": "INT. LOCATION - TIME",
      "location": "LOCATION",
      "time_of_day": "TIME",
      "characters": ["CHAR1", "CHAR2"],
      "dialogue_stats": {{"lines": 0, "words": 0, "question_rate": 0.0, "exclamation_rate": 0.0, "avg_line_words": 0.0}},
      "action_stats": {{"words": 0, "stage_directions": 0}},
      "horror_signals": {{"night": 0, "dark": 0, "blood": 0, "scream": 0, "fear": 0, "death": 0, "shadow": 0, "creepy": 0, "silent": 0, "knife": 0}},
      "tension_score": 0.0,
      "fear_emotion": 0.0,
      "sentiment": 0.0,
      "scene_summary": "Brief description"
    }}
  ]
}}"""
    
    return prompt

def process_scene_chunk_hybrid(film_title: str, scenes: List[str], chunk_index: int) -> Tuple[List[Dict[str, Any]], bool]:
    """Process a chunk of scenes with hybrid approach"""
    try:
        user_prompt = build_chunk_prompt(film_title, scenes)
        
        
        try:
            result = call_gpt_with_retry(SYSTEM_PROMPT_MINI, user_prompt, BATCH_SCHEMA, "gpt-4o-mini", 2)
            
            
            for scene in result["scenes"]:
                scene["film_title"] = film_title
                scene["scene_index"] = scene.get("scene_index", 0) + (chunk_index * 4)
            
            print(f"✅ Processed chunk {chunk_index + 1} with gpt-4o-mini ({len(scenes)} scenes)")
            return result["scenes"], True
            
        except Exception as e:
            print(f"⚠️  gpt-4o-mini failed for chunk {chunk_index + 1}, trying gpt-4o: {e}")
            
            
            try:
                result = call_gpt_with_retry(SYSTEM_PROMPT_4O, user_prompt, BATCH_SCHEMA, "gpt-4o", 2)
                
                
                for scene in result["scenes"]:
                    scene["film_title"] = film_title
                    scene["scene_index"] = scene.get("scene_index", 0) + (chunk_index * 4)
                
                print(f"✅ Processed chunk {chunk_index + 1} with gpt-4o ({len(scenes)} scenes)")
                return result["scenes"], True
                
            except Exception as e2:
                print(f"❌ Both models failed for chunk {chunk_index + 1}: {e2}")
                
                fallback_result = create_fallback_result(user_prompt)
                for scene in fallback_result["scenes"]:
                    scene["film_title"] = film_title
                    scene["scene_index"] = scene.get("scene_index", 0) + (chunk_index * 4)
                return fallback_result["scenes"], False
        
    except Exception as e:
        print(f"❌ Chunk {chunk_index + 1} failed completely: {e}")
        return [], False

def flatten_scene_row(scene: Dict[str, Any]) -> Dict[str, Any]:
    """Flatten scene data for CSV export"""
    base = {
        "film_title": scene.get("film_title", ""),
        "scene_index": scene.get("scene_index", 0),
        "heading": scene.get("heading", ""),
        "location": scene.get("location", ""),
        "time_of_day": scene.get("time_of_day", ""),
        "characters": "|".join(scene.get("characters", [])),
        "dialogue_lines": scene.get("dialogue_stats", {}).get("lines", 0),
        "dialogue_words": scene.get("dialogue_stats", {}).get("words", 0),
        "dialogue_q_rate": scene.get("dialogue_stats", {}).get("question_rate", 0.0),
        "dialogue_excl_rate": scene.get("dialogue_stats", {}).get("exclamation_rate", 0.0),
        "dialogue_avg_line_words": scene.get("dialogue_stats", {}).get("avg_line_words", 0.0),
        "action_words": scene.get("action_stats", {}).get("words", 0),
        "stage_directions": scene.get("action_stats", {}).get("stage_directions", 0),
        "tension_score": scene.get("tension_score", 0.0),
        "fear_emotion": scene.get("fear_emotion", 0.0),
        "sentiment": scene.get("sentiment", 0.0),
        "scene_summary": scene.get("scene_summary", "")
    }
    
    
    signals = scene.get("horror_signals", {})
    for term in HORROR_LEXICON:
        base[f"hs_{term}"] = int(signals.get(term, 0))
    
    return base

def process_script_hybrid(script_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """Process a single script with hybrid approach"""
    print(f"Processing: {script_path}")
    
    stats = {"mini_success": 0, "4o_success": 0, "fallback": 0, "total_chunks": 0}
    
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        film_title = os.path.splitext(os.path.basename(script_path))[0]
        scenes = split_scenes_heuristic(text)
        
        if not scenes:
            print(f"[WARN] No scenes found: {script_path}")
            return [], stats
        
        
        chunks = preprocess_scene_chunk(scenes, max_chunk_size=4)
        print(f"Split into {len(chunks)} chunks")
        stats["total_chunks"] = len(chunks)
        
        
        all_scenes = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_chunk = {
                executor.submit(process_scene_chunk_hybrid, film_title, chunk, i): i 
                for i, chunk in enumerate(chunks)
            }
            
            for future in as_completed(future_to_chunk):
                chunk_index = future_to_chunk[future]
                try:
                    chunk_scenes, success = future.result()
                    all_scenes.extend(chunk_scenes)
                    if success:
                        stats["mini_success"] += 1
                    else:
                        stats["fallback"] += 1
                except Exception as e:
                    print(f"❌ Chunk {chunk_index + 1} failed: {e}")
                    stats["fallback"] += 1
        
        return [flatten_scene_row(scene) for scene in all_scenes], stats
        
    except Exception as e:
        print(f"[ERROR] {script_path}: {e}")
        return [], stats

def main(scripts_dir: str, out_dir: str, max_workers: int = 4):
    """Main processing function with hybrid approach"""
    os.makedirs(out_dir, exist_ok=True)
    
    
    script_files = []
    for root, _, files in os.walk(scripts_dir):
        for file in files:
            if file.endswith('.txt') and file != 'downloaded_files.json':
                script_files.append(os.path.join(root, file))
    
    if not script_files:
        print("No script files found")
        return
    
    print(f"Found {len(script_files)} scripts to process")
    print(f"Using {max_workers} parallel workers")
    print("🚀 Hybrid approach: gpt-4o-mini → gpt-4o → fallback")
    
    
    all_scene_rows = []
    total_stats = {"mini_success": 0, "4o_success": 0, "fallback": 0, "total_chunks": 0}
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_script = {
            executor.submit(process_script_hybrid, script_path): script_path 
            for script_path in script_files
        }
        
        completed_count = 0
        for future in as_completed(future_to_script):
            script_path = future_to_script[future]
            try:
                rows, stats = future.result()
                all_scene_rows.extend(rows)
                
                
                for key in total_stats:
                    total_stats[key] += stats[key]
                
                completed_count += 1
                print(f"✅ [{completed_count}/{len(script_files)}] {os.path.basename(script_path)} ({len(rows)} scenes)")
            except Exception as e:
                print(f"❌ [{completed_count}/{len(script_files)}] {os.path.basename(script_path)} - {e}")
    
    if not all_scene_rows:
        print("No scenes parsed. Check your inputs.")
        return
    
    
    print(f"\n📊 Processing Statistics:")
    print(f"   Total chunks: {total_stats['total_chunks']}")
    print(f"   gpt-4o-mini success: {total_stats['mini_success']} ({total_stats['mini_success']/total_stats['total_chunks']*100:.1f}%)")
    print(f"   gpt-4o fallback: {total_stats['4o_success']} ({total_stats['4o_success']/total_stats['total_chunks']*100:.1f}%)")
    print(f"   Fallback data: {total_stats['fallback']} ({total_stats['fallback']/total_stats['total_chunks']*100:.1f}%)")
    
    
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    structured_dir = os.path.join(out_dir, f"analysis_{timestamp}")
    os.makedirs(structured_dir, exist_ok=True)
    
    
    scenes_df = pd.DataFrame(all_scene_rows).sort_values(["film_title","scene_index"])
    
    
    scenes_csv = os.path.join(structured_dir, "scenes_detailed.csv")
    scenes_df.to_csv(scenes_csv, index=False)
    print(f"💾 Wrote {scenes_csv} ({len(scenes_df)} rows)")
    
    
    horror_cols = [col for col in scenes_df.columns if col.startswith('hs_')]
    horror_df = scenes_df[['film_title', 'scene_index', 'heading'] + horror_cols].copy()
    horror_csv = os.path.join(structured_dir, "horror_signals.csv")
    horror_df.to_csv(horror_csv, index=False)
    print(f"💾 Wrote {horror_csv}")
    
    
    emotion_cols = ['film_title', 'scene_index', 'heading', 'tension_score', 'fear_emotion', 'sentiment', 'scene_summary']
    emotion_df = scenes_df[emotion_cols].copy()
    emotion_csv = os.path.join(structured_dir, "emotional_analysis.csv")
    emotion_df.to_csv(emotion_csv, index=False)
    print(f"💾 Wrote {emotion_csv}")
    
    
    dialogue_cols = ['film_title', 'scene_index', 'heading', 'characters', 'dialogue_lines', 'dialogue_words', 'dialogue_q_rate', 'dialogue_excl_rate']
    dialogue_df = scenes_df[dialogue_cols].copy()
    dialogue_csv = os.path.join(structured_dir, "dialogue_analysis.csv")
    dialogue_df.to_csv(dialogue_csv, index=False)
    print(f"💾 Wrote {dialogue_csv}")
    
    
    summary_data = {
        'analysis_timestamp': timestamp,
        'total_films': scenes_df['film_title'].nunique(),
        'total_scenes': len(scenes_df),
        'avg_scenes_per_film': len(scenes_df) / scenes_df['film_title'].nunique(),
        'avg_tension': scenes_df['tension_score'].mean(),
        'avg_fear': scenes_df['fear_emotion'].mean(),
        'total_dialogue_words': scenes_df['dialogue_words'].sum(),
        'total_action_words': scenes_df['action_words'].sum(),
        'mini_success_rate': total_stats['mini_success'] / total_stats['total_chunks'] if total_stats['total_chunks'] > 0 else 0,
        '4o_fallback_rate': total_stats['4o_success'] / total_stats['total_chunks'] if total_stats['total_chunks'] > 0 else 0,
        'fallback_rate': total_stats['fallback'] / total_stats['total_chunks'] if total_stats['total_chunks'] > 0 else 0
    }
    
    summary_df = pd.DataFrame([summary_data])
    summary_csv = os.path.join(structured_dir, "analysis_summary.csv")
    summary_df.to_csv(summary_csv, index=False)
    print(f"💾 Wrote {summary_csv}")
    
    print(f"\n🎉 Analysis complete!")
    print(f"📁 All files saved to: {structured_dir}")
    print(f"📊 Processed {summary_data['total_films']} films with {summary_data['total_scenes']} total scenes")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Hybrid horror script parser: mini + 4o + fallback")
    ap.add_argument("--scripts_dir", required=True, help="Directory containing screenplay .txt files")
    ap.add_argument("--out_dir", default="./out_hybrid", help="Output directory")
    ap.add_argument("--max_workers", type=int, default=4, help="Number of parallel workers")
    args = ap.parse_args()
    main(args.scripts_dir, args.out_dir, args.max_workers)
