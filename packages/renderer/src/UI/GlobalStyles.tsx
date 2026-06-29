import { createGlobalStyles as css } from '../emotion-solid';
import ChessTypeFont from '../fonts/ChessType.ttf';
import DSEG14Classic from '../fonts/DSEG14Classic-Regular.ttf';
import OswaldFont from '../fonts/Oswald.ttf';

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
    /* Global UI density. The skeuomorphic rack is drawn at large fixed sizes;
       scaling the whole app down a touch fits far more on screen. Tunable via
       the --ui-scale custom property (set from localStorage in App); defaults
       to 1 here so there's no flash before the script runs. */
    zoom: var(--ui-scale, 1);
  }

  *[hidden] {
    display: none !important;
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
