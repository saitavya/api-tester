// Case-insensitive "contains" check that handles undefined safely
function contains(haystack, needle) {
  if (!needle) return true
  if (haystack == null) return false
  return String(haystack).toLowerCase().includes(needle.toLowerCase())
}

export function matchHistoryItem(item, query) {
  if (!query) return true
  return contains(item.url, query) || contains(item.method, query)
}

export function matchRequest(req, query) {
  if (!query) return true
  return (
    contains(req.name, query) ||
    contains(req.url, query) ||
    contains(req.method, query)
  )
}

// A collection "matches" if its name matches OR any of its requests match.
// Returns the filtered list of requests for that collection.
export function filterCollection(collection, requests, query) {
  if (!query) {
    return { matches: true, requests }
  }

  const nameMatches = contains(collection.name, query)
  const matchingRequests = requests.filter((r) => matchRequest(r, query))

  if (nameMatches) {
    // If the collection name matches, show all its requests
    return { matches: true, requests }
  }

  return {
    matches: matchingRequests.length > 0,
    requests: matchingRequests,
  }
}