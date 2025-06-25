// origins = ilxtr:hasSomaLocatedIn
// destinations = ilxtr:hasAxonPresynapticElementIn, ilxtr:hasAxonSensorySubcellularElementIn
// vias (components) = none of the above

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

export {
  filterOrigins,
  filterDestinations,
  filterVias,
}
