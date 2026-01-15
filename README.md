# Ultima RPG

A simple Ultima-inspired RPG, built through AI collaboration with Pixel.

## Play

https://emremotan.github.io/ultima-rpg/

## Development

Built with:
- Plain HTML5 Canvas (no frameworks)
- Grey box prototyping approach
- Mobile-first, one-handed controls

## Architecture

- `index.html` - Main entry point
- `js/game.js` - Game engine and rendering
- `css/style.css` - Mobile UI styling

## Publishing Workflow

### Before Publishing
1. **Increment version** in two places:
   - `js/game.js`: Update `const VERSION = 'x.x.x';`
   - `index.html`: Update `?v=x.x.x` in the script tag

### Publish Commands
```bash
cd ~/clawd/games/ultima-rpg
git add -A
git commit -m "Brief description of changes"
git push origin main
# GitHub Pages auto-deploys in ~1-2 minutes
```

## Credits

Inspired by Ultima I (1981) and the Lowlander mobile games.
