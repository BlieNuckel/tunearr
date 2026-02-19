interface StepDescriptionProps {
  text: string;
}

export default function StepDescription({ text }: StepDescriptionProps) {
  return <p className="text-sm text-gray-500 mb-4">{text}</p>;
}
