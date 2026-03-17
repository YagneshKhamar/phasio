export function runRuleBasedCheck(output: string, checkValue: string): boolean {
  return output.toLowerCase().includes(checkValue.toLowerCase());
}
