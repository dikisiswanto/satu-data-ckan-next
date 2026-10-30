/** Keep the public layout stable between route transitions. The template
 * intentionally adds no visual transition: static headings and cards should
 * not fade or move while Next.js swaps route content. */
export default function PublicPageTemplate({ children }) {
  return children;
}
