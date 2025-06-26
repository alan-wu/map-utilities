// origins = ilxtr:hasSomaLocatedIn
// destinations = ilxtr:hasAxonPresynapticElementIn, ilxtr:hasAxonSensorySubcellularElementIn
// vias = ilxtr:hasAxonLeadingToSensorySubcellularElementIn, ilxtr:hasAxonLocatedIn

function filterOrigins(item) {
  const soma = item["node-phenotypes"]?.["ilxtr:hasSomaLocatedIn"];
  return Array.isArray(item.connectivity) &&
    item.connectivity.length > 0 &&
    Array.isArray(soma) &&
    soma.length > 0;
}

function filterDestinations(item) {
  const axonPresyn = item["node-phenotypes"]?.["ilxtr:hasAxonPresynapticElementIn"];
  const axonSensory = item["node-phenotypes"]?.["ilxtr:hasAxonSensorySubcellularElementIn"];
  const hasDest =
    (Array.isArray(axonPresyn) && axonPresyn.length > 0) ||
    (Array.isArray(axonSensory) && axonSensory.length > 0);
  return Array.isArray(item.connectivity) &&
    item.connectivity.length > 0 &&
    hasDest;
}

function filterVias(item) {
  if (!Array.isArray(item.connectivity) || item.connectivity.length === 0) return false;

  const origins = new Set(
    (item["node-phenotypes"]?.["ilxtr:hasSomaLocatedIn"] || []).map(arr => arr[0])
  );
  const destinations = new Set([
    ...((item["node-phenotypes"]?.["ilxtr:hasAxonPresynapticElementIn"] || []).map(arr => arr[0])),
    ...((item["node-phenotypes"]?.["ilxtr:hasAxonSensorySubcellularElementIn"] || []).map(arr => arr[0]))
  ]);

  return item.connectivity.some(pair => {
    const [from, to] = pair;
    const fromId = from[0];
    const toId = to[0];
    return (
      !origins.has(fromId) &&
      !destinations.has(toId)
    );
  });
}

function getConnectivityItems(obj) {
  if (!Array.isArray(obj.connectivity)) return [];
  const items = new Set();

  obj.connectivity.forEach((pair) => {
    if (Array.isArray(pair) && pair.length) {
      pair.forEach((endpoint) => {
        if (Array.isArray(endpoint) && typeof endpoint[0] === 'string') {
          const stringifyEndpoint = JSON.stringify(endpoint);
          items.add(stringifyEndpoint);
        }
      });
    }
  });
  return Array.from(items);
}

function getPhenotypeItems(obj, prop) {
  const arr = obj["node-phenotypes"]?.[prop];
  if (!Array.isArray(arr)) return [];
  return arr;
}

function extractOriginItems(knowledge) {
  const results = [];
  knowledge.forEach(obj => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return;
    const connectivityItems = new Set(getConnectivityItems(obj));
    getPhenotypeItems(obj, "ilxtr:hasSomaLocatedIn").forEach((item) => {
      const stringifyItem = JSON.stringify(item);
      if (connectivityItems.has(stringifyItem)) results.push(item);
    });
  });
  return Array.from(
    new Map(results.map(item => [JSON.stringify(item), item])).values()
  );
}

function extractDestinationItems(knowledge) {
  const results = [];
  knowledge.forEach(obj => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return;
    const connectivityItems = new Set(getConnectivityItems(obj));
    [
      ...getPhenotypeItems(obj, "ilxtr:hasAxonPresynapticElementIn"),
      ...getPhenotypeItems(obj, "ilxtr:hasAxonSensorySubcellularElementIn")
    ].forEach(item => {
      const stringifyItem = JSON.stringify(item);
      if (connectivityItems.has(stringifyItem)) results.push(item);
    });
  });
  return Array.from(
    new Map(results.map(item => [JSON.stringify(item), item])).values()
  );
}

function extractViaItems(knowledge) {
  const results = [];
  knowledge.forEach(obj => {
    if (!Array.isArray(obj.connectivity) || obj.connectivity.length === 0) return;
    const connectivityItems = new Set(getConnectivityItems(obj));
    [
      ...getPhenotypeItems(obj, "ilxtr:hasAxonLeadingToSensorySubcellularElementIn"),
      ...getPhenotypeItems(obj, "ilxtr:hasAxonLocatedIn")
    ].forEach(item => {
      const stringifyItem = JSON.stringify(item);
      if (connectivityItems.has(stringifyItem)) results.push(item);
    });
  });
  return Array.from(
    new Map(results.map(item => [JSON.stringify(item), item])).values()
  );
}

export {
  filterOrigins,
  filterDestinations,
  filterVias,
  extractOriginItems,
  extractDestinationItems,
  extractViaItems,
}
