import { UserCircleIcon } from "@/components/icons";

type UserAvatarProps = {
  thumb: string | null;
  username?: string;
  className?: string;
};

export default function UserAvatar({
  thumb,
  username,
  className = "w-10 h-10",
}: UserAvatarProps) {
  if (thumb) {
    return (
      <img
        src={thumb}
        alt={username ?? "User avatar"}
        className={`rounded-full border-2 border-black object-cover ${className}`}
      />
    );
  }

  return (
    <UserCircleIcon
      className={`text-gray-400 dark:text-gray-500 ${className}`}
    />
  );
}
