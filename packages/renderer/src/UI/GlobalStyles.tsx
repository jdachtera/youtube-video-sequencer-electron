import ChessTypeFont from '../fonts/ChessType.ttf';
import OswaldFont from '../fonts/Oswald.ttf';
import DSEG14Classic from '../fonts/DSEG14Classic-Regular.ttf';

import { createGlobalStyles as css } from '../emotion-solid';

const ChessType = css`
  @font-face {
    font-family: 'chesstype';
    font-weight: 500;
    src: url('${ChessTypeFont}') format('truetype');
  }
`;

const Oswald = css`
  @font-face {
    font-family: 'oswald';
    font-weight: 400;
    src: url('${OswaldFont}') format('truetype');
  }
`;

const SevenSeg = css`
  @font-face {
    font-family: '7seg';
    font-weight: 300;
    src: url('${DSEG14Classic}') format('truetype');
  }
`;

const Styles = css`
  img {
    pointer-events: none;
  }

  html,
  body,
  ol,
  ul {
    margin: 0;
    padding: 0;
    background: #4b4b4b;
    color: #eee;
  }

  body {
    overflow: hidden;
  }

  input[type='number'] {
    text-align: left;
  }

  .wavesurfer-region {
    z-index: 1 !important;
    /* z-index: 9999 !important; */
  }

  .wavesurfer-handle {
    opacity: 0;
  }

  .wavesurfer wave {
    color: red !important;
  }

  .video-js {
    width: 500px !important;
  }

  .slice {
    user-select: none;
  }

  #path1209 {
    stroke: red;
  }
  #root {
    width: 100%;
    height: 100%;
    display: flex;
  }

  *[hidden] {
    display: none !important;
  }

  /*
   It's pure CSS.
   Since a quick google search will confirm people going crazy about Mac OS Lion scrollbars...
   these scrollbars have no fade-out effect.

   In Mac OS Lion, the lowest common denominator is always showing scrollbars by a setting.
   So, this fits that lowest common denominator.
   Facebook, lifehacker, and Google have all basically taken this approach. Of course Google uses incredibly ugly square scrollbars, but so be it.
   Also, in regards to the fade in/out effect, this may just be one reason why soo many people outraged (and still hide) the ticker.
   Ending note: I recommend this for non-lion users. As a lion user, I prefer my fading out scrollbars. If you sniff a UA of mac os lion, don't add this css.
*/

  /*  After doing my first post here on Dabblet, I dug into their custom
  scrollbar css.

  here that is, I starred the box-shadow css for the nice pop.

section.page:not(.focus):not(:hover)::-webkit-scrollbar {
  display: none;
}
::-webkit-scrollbar-track,::-webkit-scrollbar-thumb {
  border: 5px solid transparent;
  border-radius: 999px;
}
::-webkit-scrollbar-track {
  ** box-shadow: 1px 1px 5px rgba(0,0,0,.2) inset; **
}
::-webkit-scrollbar-thumb {
  background: url(/img/noise.png);
  background-clip: content-box;
  ** box-shadow: 0 0 0 5px hsla(24, 20%, 50%,.4) inset; **
  min-height: 20px;
}
::-webkit-scrollbar-corner {
  background: transparent;
}
*/

  /* Turn on custom 8px wide scrollbar */
  ::-webkit-scrollbar {
    width: 8px; /* 1px wider than Lion. */
    /* This is more usable for users trying to click it. */
    background-color: rgba(0, 0, 0, 0);
    -webkit-border-radius: 100px;
  }
  /* hover effect for both scrollbar area, and scrollbar 'thumb' */
  ::-webkit-scrollbar:hover {
    background-color: rgba(0, 0, 0, 0.09);
  }

  /* The scrollbar 'thumb' ...that marque oval shape in a scrollbar */
  ::-webkit-scrollbar-thumb:vertical {
    /* This is the EXACT color of Mac OS scrollbars.
     Yes, I pulled out digital color meter */
    background: rgba(0, 0, 0, 0.5);
    -webkit-border-radius: 100px;
  }
  ::-webkit-scrollbar-thumb:vertical:active {
    background: rgba(0, 0, 0, 0.61); /* Some darker color when you click it */
    -webkit-border-radius: 100px;
  }
`;

export const GlobalStyles = () => {
  return (
    <>
      <ChessType />
      <Oswald />
      <SevenSeg />
      <Styles />
    </>
  );
};
