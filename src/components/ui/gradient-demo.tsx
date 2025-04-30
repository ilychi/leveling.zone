import { GradientText } from "@/components/ui/gradient-text"

export function GradientTextBorderDemo() {
  return (
    <div className="space-y-8">
      {/* Basic example */}
      <GradientText
        colors={["#40ffaa", "#4079ff", "#40ffaa"]}
        animationSpeed={3}
        className="text-3xl font-semibold"
      >
        Custom Colors
      </GradientText>
    </div>
  )
}

export function GradientTextDemo() {
  return (
    <div className="space-y-8">
      {/* With border */}
      <GradientText
        colors={["#ff40aa", "#40aaff", "#ff40aa"]}
        showBorder
        className="text-2xl font-medium px-4 py-2"
      >
        With Animated Border
      </GradientText>
    </div>
  )
} 
