import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import { css } from '@emotion/css';

const RackEar = () => {
  return ( 
  <div
    className={css`
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      // border-right: 1px inset #222;
      // border-bottom: 1px outset #777;
      box-shadow: 0px 0px 2px #222;
      `}>
      <img
        alt="screw"
        src={ScrewHeadWithHole}
        width="35px"
        style={{ margin: '8px' }}
      />
      <img
        alt="screw"
        src={ScrewHeadWithHole}
        width="35px"
        style={{ margin: '8px' }}
      />
  </div>)
}

export default RackEar;

