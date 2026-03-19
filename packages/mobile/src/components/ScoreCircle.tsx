import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../lib/theme.js";
import { scoreColor } from "../lib/format.js";

interface ScoreCircleProps {
  score: number;
  size?: number;
}

const SCORE_COLORS = {
  red: colors.red[400],
  amber: colors.amber[500],
  green: colors.green[500],
  blue: colors.blue[500],
} as const;

export function ScoreCircle({ score, size = 56 }: ScoreCircleProps): React.JSX.Element {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const color = SCORE_COLORS[scoreColor(score)];

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [animatedValue]);

  const animatedStyle = {
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        }),
      },
    ],
    opacity: animatedValue,
  };

  const fontSize = size < 48 ? 14 : size < 64 ? 18 : 22;
  const borderWidth = size < 48 ? 2 : 3;

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: color,
          backgroundColor: `${color}18`,
        },
      ]}
    >
      <Text
        style={[
          styles.scoreText,
          {
            fontSize,
            color,
          },
        ]}
      >
        {score}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontWeight: "700",
  },
});
