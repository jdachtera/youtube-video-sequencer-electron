import { createEffect, JSX, onCleanup } from 'solid-js';

export const SameHeightContainer = (props: JSX.IntrinsicElements['div']) => {
  let parent: HTMLDivElement | undefined;

  const handleResize = () => {
    let maxHeight = 0;
    parent?.childNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.minHeight = '';
    });

    parent?.childNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      maxHeight = node.clientHeight > maxHeight ? node.clientHeight : maxHeight;
    });

    parent?.childNodes?.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.minHeight = `${maxHeight}px`;
    });
  };

  const resizeObserver = new ResizeObserver(() => handleResize());

  createEffect((children) => {
    if (props.children !== children) {
      handleResize();

      resizeObserver.disconnect();

      parent?.childNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        resizeObserver.observe(node);
      });
    }
  });

  onCleanup(() => {
    resizeObserver.disconnect();
  });

  return <div {...props} ref={parent}></div>;
};
