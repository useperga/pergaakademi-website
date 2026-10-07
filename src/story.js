/*
  The hero timeline. Everything in the hero reads from this one clock.

  Times are in SECONDS OF FILM. Right now the film is the procedural conic
  sequence in film.js (12 s long). When you add your own clip:

    1. Encode it for scrubbing (every frame a keyframe, no audio):
         ffmpeg -i in.mp4 -an -c:v libx264 -g 1 -crf 22 -pix_fmt yuv420p -movflags +faststart public/media/hero.mp4
       Optional portrait cut for phones: public/media/hero-mobile.mp4
    2. The site detects the file on load and swaps the canvas for the video.
    3. Retime the cues below to the moments in your clip (open it in any
       player, note the second each scene starts) and set `duration` to the
       clip length. Nothing else needs to change.

  Each cue: `in` = [start, end] of its entrance, `out` = [start, end] of its
  exit. `stagger` offsets each line/letter inside the cue by that many seconds
  (`outStagger`, if given, is used for the exit instead).
*/
export const STORY = {
  duration: 12,

  video: {
    src: '/media/hero.mp4',
    srcMobile: '/media/hero-mobile.mp4',
  },

  cues: {
    // Scene 1: a single beam opens into a cone of light.
    a: { in: [-1.15, -0.1], out: [1.6, 2.5], stagger: 0.14 },
    // Scene 2: a plane slices the cone, circle becomes ellipse.
    b: { in: [3.05, 4.05], out: [5.15, 5.95], stagger: 0.16 },
    note: { in: [3.7, 4.5], out: [7.7, 8.3] },
    // Scene 3: the cut opens into a parabola, a spark travels the curve.
    c: { in: [6.0, 7.1], out: [8.0, 8.7], stagger: 0.05 },
    // Scene 4: orbits gather around one focus, the full sentence assembles.
    d: { in: [8.9, 9.8], out: [10.9, 11.5], stagger: 0.2, outStagger: 0.07 },
    // Persistent hero copy + CTAs, present from the first frame.
    dock: { in: [-0.9, 0.05], out: [10.85, 11.45] },
  },

  // Scene 5: light floods the frame and becomes the page.
  flood: [11.0, 11.92],
};
