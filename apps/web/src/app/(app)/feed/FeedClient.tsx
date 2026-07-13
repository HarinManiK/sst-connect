import { AppBar, Wordmark } from "@/components/AppBar";
import { EmptyState } from "@/components/EmptyState";
import { HomeIcon } from "@/components/Icons";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";

export type FeedItem = {
  id: string;
  authorName: string;
  authorAvatar: string | null;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
};

export function FeedClient({
  me,
  posts,
}: {
  me: { name: string; avatar: string | null };
  posts: FeedItem[];
}) {
  return (
    <div>
      <AppBar title={<Wordmark />} />
      <PostComposer authorName={me.name} authorAvatar={me.avatar} />

      <div className="pb-4">
        {posts.length === 0 ? (
          <EmptyState
            icon={<HomeIcon />}
            title="Nothing here yet"
            subtitle="Be the first to post something to your batch."
          />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              postId={post.id}
              authorName={post.authorName}
              authorAvatar={post.authorAvatar}
              content={post.content}
              imageUrl={post.imageUrl}
              createdAt={post.createdAt}
              likeCount={post.likeCount}
              commentCount={post.commentCount}
              liked={post.liked}
            />
          ))
        )}
      </div>
    </div>
  );
}
