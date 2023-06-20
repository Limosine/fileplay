export const chunkString = (string: string, parts: number): string[] => {
  const chunkSize = Math.ceil(string.length / parts);
  const chunks: string[] = [];

  for (let i = 0; i < string.length; i += chunkSize) {
    chunks.push(string.slice(i, i + chunkSize));
  }

  return chunks;
};

export function sortArrayByOrder(
  array: { chunkID: string; fileChunk: string }[],
  order: string[]
): { chunkID: string; fileChunk: string }[] {
  const orderMap = new Map<string, number>();

  // Create a map to store the index of each chunkID in the order array
  order.forEach((chunkID, index) => {
    orderMap.set(chunkID, index);
  });

  // Sort the array based on the order using the custom comparator function
  array.sort((a, b) => {
    const indexA = orderMap.get(a.chunkID) || -1; // Default to -1 if chunkID not found in the order array
    const indexB = orderMap.get(b.chunkID) || -1;

    return indexA - indexB;
  });

  return array;
}
