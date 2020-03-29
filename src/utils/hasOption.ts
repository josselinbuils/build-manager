export function hasOption(args: string[], option: string): boolean {
  return (
    args.includes(`--${option}`) || args.includes(`-${option.slice(0, 1)}`)
  );
}
