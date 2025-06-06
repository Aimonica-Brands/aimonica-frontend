declare namespace JSX {
  interface IntrinsicElements {
    'appkit-button': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        size?: 'sm' | 'md' | 'lg';
      },
      HTMLElement
    >;
  }
}
