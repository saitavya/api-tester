// Replaces {{variable}} placeholders in a string with values from the env map
export function substituteVariables(text, variables) {
  if (!text || typeof text !== 'string') return text
  if (!variables || Object.keys(variables).length === 0) return text

  return text.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (match, varName) => {
    return variables.hasOwnProperty(varName) ? variables[varName] : match
  })
}

// Converts an array of {key, value, enabled} into a flat lookup map
export function envArrayToMap(envVars) {
  if (!envVars) return {}
  const map = {}
  envVars.forEach((v) => {
    if (v.enabled && v.key) map[v.key] = v.value
  })
  return map
}