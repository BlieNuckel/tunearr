import FilterBar from "@/components/FilterBar";

interface RequestFilterProps {
  values: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
}

const REQUEST_FILTERS = [
  {
    key: "requester",
    label: "Requester",
    combineMode: "and" as const,
    options: [{ value: "mine", label: "Me" }],
  },
  {
    key: "status",
    label: "Status",
    combineMode: "or" as const,
    options: [
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "declined", label: "Declined" },
    ],
  },
];

export default function RequestFilter({
  values,
  onChange,
}: RequestFilterProps) {
  return (
    <FilterBar filters={REQUEST_FILTERS} values={values} onChange={onChange} />
  );
}
