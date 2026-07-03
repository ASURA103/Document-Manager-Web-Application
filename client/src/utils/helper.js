export const truncateText = (text, length = 80) => {
  if (!text) return "";
  return text.length > length ? text.slice(0, length) + "..." : text;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleString();
};