import StatCard from "../common/StatCard";

export default function MyPageStatCard({
  title,
  value,
  subtext,
  icon,
  color = "blue",
  onClick,
  index = 0,
}) {
  return (
    <StatCard
      title={title}
      value={value}
      description={subtext}
      icon={icon}
      color={color}
      onClick={onClick}
      index={index}
    />
  );
}
