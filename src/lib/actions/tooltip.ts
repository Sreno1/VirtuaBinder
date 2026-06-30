import tippy, { type Instance, type Props } from 'tippy.js';
import 'tippy.js/dist/tippy.css';

export function tooltip(node: HTMLElement, content: string | Partial<Props>) {
  const instance: Instance = tippy(node, {
    content: typeof content === 'string' ? content : content.content,
    delay: [250, 0],
    duration: [140, 100],
    placement: 'top',
    theme: 'timeline',
    ...(typeof content === 'string' ? {} : content)
  });

  return {
    update(nextContent: string | Partial<Props>) {
      instance.setProps({
        content: typeof nextContent === 'string' ? nextContent : nextContent.content,
        ...(typeof nextContent === 'string' ? {} : nextContent)
      });
    },
    destroy() {
      instance.destroy();
    }
  };
}
