export function runRuleBasedCheck(
  output: string,
  checkValue: string,
  checkType: string,
): boolean {
  switch (checkType) {
    case 'contains':
      return output.toLowerCase().includes(checkValue.toLowerCase());
    case 'not_contains':
      return !output.toLowerCase().includes(checkValue.toLowerCase());
    case 'regex':
      try {
        return new RegExp(checkValue).test(output);
      } catch {
        return false; // invalid regex = fail, don't crash
      }
    default:
      return false;
  }
}
