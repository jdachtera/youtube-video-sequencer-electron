import glsl from 'glslify';
import {
  createEffect,
  JSX,
  onCleanup,
  onMount,
  splitProps,
  untrack,
} from 'solid-js';
import { css } from 'solid-styled-components';
import * as THREE from 'three';
import { Renderer } from 'three';

export const Shader = (
  props: JSX.IntrinsicElements['canvas'] & {
    shaderParams: THREE.ShaderMaterialParameters;
  }
) => {
  const [ownProps, canvasProps] = splitProps(props, ['shaderParams']);

  let canvas: HTMLCanvasElement | undefined;
  let isMounted = false;

  onMount(() => {
    isMounted = true;
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.autoClearColor = false;

    const camera = new THREE.OrthographicCamera(
      -1, // left
      1, // right
      1, // top
      -1, // bottom
      -1, // near,
      1 // far
    );
    const scene = new THREE.Scene();
    const plane = new THREE.PlaneBufferGeometry(2, 2);
    const material = new THREE.ShaderMaterial(props.shaderParams);

    scene.add(new THREE.Mesh(plane, material));

    function resizeRendererToDisplaySize(renderer: Renderer) {
      const canvas = renderer.domElement;
      const pixelRatio = window.devicePixelRatio;
      const width = (canvas.clientWidth * pixelRatio) | 0;
      const height = (canvas.clientHeight * pixelRatio) | 0;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        renderer.setSize(width, height, false);
      }
      return needResize;
    }

    function render(time: number) {
      if (!isMounted) return;

      time *= 0.001; // convert to seconds

      resizeRendererToDisplaySize(renderer);

      const canvas = renderer.domElement;

      if (ownProps.shaderParams.uniforms) {
        ownProps.shaderParams.uniforms.iResolution.value.set(
          canvas.width,
          canvas.height,
          1
        );
        ownProps.shaderParams.uniforms.iTime.value = time;
      }

      renderer.render(scene, camera);

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  });

  onCleanup(() => {
    isMounted = false;
  });

  return <canvas {...canvasProps} ref={canvas} />;
};

const fragmentShader = glsl`
#include <common>

#define N 6.

uniform vec3 iResolution;
uniform float iTime;
uniform float rotation;

const float r1 = 0.75;
const float r2 = 1./r1;

vec4 over( in vec4 a, in vec4 b ) {
    return mix(a, b, 1.-a.w);
}

float nCap(vec2 uv, float angle, float r) {
    float a = atan(uv.y, uv.x)+angle;
    float b = a/PI*N/2.+PI*r2*2.0;
    float f = fract(b);
    float l = length(uv);
    float d = sin(f*PI*r2) * step(f, r1);
    return (1.-d*0.12)*r-l;
}

float line( in vec2 p, in vec2 a, in vec2 b ) {
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord-iResolution.xy*0.5)/-iResolution.y*2.0;

    float av = rotation;

    mat2 m = mat2(cos(av), sin(av), -sin(av), cos(av));

    float a = atan(uv.y, uv.x);
    float l = length(uv);
    float g = -1. + smoothstep(.5, -.5, uv.y) * 2.;

    vec4 col = vec4(0); // background

    if(l < .96) {
      float d = .0;
        for(float q = 0. ; q < 11. ; q += 1.) {
            float aq = -PI*1./3.+q*PI*1./6.;
            mat2 m = mat2(cos(aq), sin(aq), -sin(aq), cos(aq));
            d += smoothstep(.002, .001, line(uv, vec2(.0, .0), vec2(.88, .0)*m)-.012);
        }
        col = over(vec4(vec3(.8), d), col); // divs

        float h = smoothstep(.04, .08, 1.25 - distance(vec2(.0, -1.4), uv))*.2
            + smoothstep(.40, .7, l)*.01;
        //col = over(vec4(vec3(.04), smoothstep(.001, .3, .88 - distance(uv, vec2(.0, .1)))*.75), col); // shadow
        col = over(vec4(vec3(.04), smoothstep(.001, .04, .74 - l)), col); // bottom
        col = over(vec4(vec3(.13+g*.04), smoothstep(.001, .01, .71 - l)), col); // bottom solid
        col = over(vec4(vec3(.13), smoothstep(.02, .001, abs(.64 - l))), col); // bottom outline
        col = over(vec4(vec3(.04), smoothstep(0.001, 0.06, nCap(uv+vec2(.0, -.12), av, .64))*.7), col); // cap shadow
        col = over(vec4(vec3(.09), smoothstep(0.01, 0.02, nCap(uv, av, .64))), col); // cap edge
        col = over(vec4(vec3(.16)+g*.1+h, smoothstep(0.001, 0.01, nCap(uv, av, .61))), col); // cap solid
        col = over(vec4(vec3(.24), smoothstep(.001, .01, .46 - l)), col); // cap top
        col = over(vec4(vec3(.44
                            + pow(abs(sin(a)),10.)*(0.1+l*1.)
                            + pow(abs(sin(a+1.4)),64.)*0.12
                            + abs(sin(l*32.)+.5)*.02
                            + g*.2
                            ), smoothstep(.001, .01, .44 - l)), col); // cap metal
        col = over(vec4(vec3(.34), smoothstep(.001, .01, .050 - distance(uv, vec2(.0, -.52)*m))), col); // value edge
        col = over(vec4(vec3(.97), smoothstep(.001, .01, .042 - distance(uv, vec2(.0, -.52)*m))), col); // value fill
    }

    col.gb += vec2(.004, .006);

  fragColor = col;

}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

export const MoogKnobShader = (
  props: JSX.IntrinsicElements['canvas'] & { rotation: number }
) => {
  const [, canvasProps] = splitProps(props, ['rotation']);

  const multiplicator = (1 / 360) * 6;

  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector3() },
    rotation: { value: untrack(() => props.rotation * multiplicator) },
  };

  createEffect(() => {
    uniforms.rotation.value = props.rotation * multiplicator;
  });

  const shaderParams = { uniforms, fragmentShader };

  return (
    <Shader
      {...canvasProps}
      class={css`
        display: inline-block;
        width: 80px;
        height: 80px;
      `}
      shaderParams={shaderParams}
    />
  );
};
