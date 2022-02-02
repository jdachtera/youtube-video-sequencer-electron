import { css } from '@emotion/css';
import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';

const rackEarStyle = css`
  box-shadow: 0px 0px 4px white;
  border: 3px outset #ffffff !important;
  background: rgb(254, 243, 241) !important;
  background: radial-gradient(
    circle,
    rgb(255, 255, 255) 0%,
    #e2e2e2 80%
  ) !important;
`;

const screwStyle = css`
  margin: 8px;
`;

const RackEar = () => {
  return (
    <div className={rackEarStyle}>
      <img
        alt="screw"
        src={ScrewHeadWithHole}
        width="35px"
        style={screwStyle}
      />
      <img
        alt="screw"
        src={ScrewHeadWithHole}
        width="35px"
        style={screwStyle}
      />
    </div>
  );
};

export default RackEar;
