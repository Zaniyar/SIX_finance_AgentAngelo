declare module "reveal.js" {
  const Reveal: {
    initialize(options?: Record<string, unknown>): Promise<void>;
    destroy(): void;
  };
  export default Reveal;
}

declare module "reveal.js/plugin/notes/notes.esm.js" {
  const Notes: unknown;
  export default Notes;
}
