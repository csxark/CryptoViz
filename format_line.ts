function formatLine(input: string): string {
  return input.replace(/\s+/g, ' ');
}

function transformLine(input: string) {
  return formatLine(input);
}
