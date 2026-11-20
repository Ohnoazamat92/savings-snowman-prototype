"""Перекодировать исходные WebP без изменения размеров, кадров и длительности.

python3 scripts/optimize-pet.py /path/to/original/pet public/assets/pet
Нужен Pillow с поддержкой animated WebP; исходники должны храниться отдельно.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('destination', type=Path)
args = parser.parse_args()
if args.source.resolve() == args.destination.resolve():
    parser.error('Исходники и результат должны быть в разных папках')
args.destination.mkdir(parents=True, exist_ok=True)

for name in ['wave', 'idle', 'jump', 'scarf', 'dance-v2', 'held', 'landing']:
    source = args.source / f'{name}.webp'
    target = args.destination / source.name
    with Image.open(source) as original:
        frames, durations = [], []
        for index in range(original.n_frames):
            original.seek(index)
            frames.append(original.convert('RGBA'))
            durations.append(original.info['duration'])
    loop = 0 if name == 'held' else 1
    frames[0].save(target, format='WEBP', save_all=True, append_images=frames[1:],
                   duration=durations, loop=loop, quality=82, lossless=False,
                   method=3, kmin=3, kmax=5)
    with Image.open(target) as result:
        assert result.n_frames == len(frames)
        assert result.info['loop'] == loop
        assert result.size == frames[0].size
        for index, frame in enumerate(frames):
            result.seek(index)
            decoded = result.convert('RGBA')
            assert result.info['duration'] == durations[index]
            assert ImageChops.difference(frame.getchannel('A'), decoded.getchannel('A')).getbbox() is None
    assert target.stat().st_size < source.stat().st_size
    print(json.dumps({'clip': name, 'before': source.stat().st_size,
                      'after': target.stat().st_size, 'frames': len(frames),
                      'duration_ms': sum(durations), 'alpha': 'identical'}), flush=True)
