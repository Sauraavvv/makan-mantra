export default function BlogPostPage({ params }: { params: { slug: string } }) {
  return <div>Blog Post: {params.slug}</div>;
}
