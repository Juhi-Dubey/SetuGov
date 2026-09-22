import {
  FileText,
  Users,
  Rocket,
  AlertTriangle,
  TrendingUp,
  Activity,
  Award,
  Clock
} from "lucide-react";
import StatCard from "../common/StatCard";

const KPI_ICONS = {
  challenges: FileText,
  applications: Users,
  pilots: Rocket,
  "at-risk": AlertTriangle,
  risk: AlertTriangle,
  evaluations: Award,
  pending: Clock,
  activity: Activity,
  trending: TrendingUp
};

const KPI_COLORS = {
  challenges: "blue",
  applications: "blue",
  pilots: "emerald",
  "at-risk": "amber",
  risk: "amber",
  evaluations: "violet",
  pending: "amber"
};

const KPI_ROUTES = {
  challenges: "/government/challenges",
  applications: "/government/applications",
  pilots: "/government/pilots",
  "at-risk": "/government/pilots"
};

export function KPICard({
  data,
  title,
  label,
  value,
  count,
  description,
  subtext,
  icon,
  color,
  valueColor,
  href,
  to,
  onClick,
  index = 0,
  className = "",
  change,
  ...props
}) {
  // If data object is provided (e.g. from GovernmentDashboard: <KPICard data={kpi} index={index} />)
  const item = data || {};

  const cardId = item.id || "";
  const displayTitle = item.label || item.title || label || title;
  const displayValue = item.value !== undefined ? item.value : (value !== undefined ? value : count);
  const displayDescription = item.subtext || item.description || subtext || description || change;

  const IconComponent =
    icon ||
    item.icon ||
    KPI_ICONS[cardId] ||
    FileText;

  const chosenColor =
    color ||
    item.color ||
    KPI_COLORS[cardId] ||
    "blue";

  const chosenHref =
    href ||
    to ||
    item.href ||
    item.to ||
    KPI_ROUTES[cardId];

  const calculatedValueColor =
    valueColor ||
    item.valueColor ||
    (cardId === "at-risk" && Number(displayValue) > 0
      ? "text-amber-700 dark:text-amber-400"
      : undefined);

  return (
    <StatCard
      index={index}
      title={displayTitle}
      value={displayValue}
      description={displayDescription}
      icon={IconComponent}
      color={chosenColor}
      valueColor={calculatedValueColor}
      to={chosenHref}
      onClick={onClick || item.onClick}
      className={className}
      {...props}
    />
  );
}

export default KPICard;
