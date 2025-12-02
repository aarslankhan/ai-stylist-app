// app-mobile/components/ShareCard.tsx
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export type ShareCardAi = {
  score: number;
  vibe: string;
  notes: string[];
  tags: string[];
};

type ShareCardProps = {
  imageUri: string | null;
  fallbackImage: string;
  ai: ShareCardAi;
};

export const ShareCard: React.FC<ShareCardProps> = ({
  imageUri,
  fallbackImage,
  ai,
}) => {
  const displayNotes = ai.notes.slice(0, 2); // tighter

  return (
    <View style={styles.card}>
      {/* Full, dominant image block – no cropping, uses letterboxing if needed */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: imageUri ?? fallbackImage }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Score overlay badge */}
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreValue}>{ai.score.toFixed(1)}</Text>
          <Text style={styles.scoreLabel}>/10</Text>
        </View>
      </View>

      {/* Content block under image */}
      <View style={styles.content}>
        {/* Vibe text */}
        <View style={styles.vibeBlock}>
          <Text style={styles.vibeTitle}>Today&apos;s fit</Text>
          <Text style={styles.vibeText} numberOfLines={2}>
            {ai.vibe}
          </Text>
        </View>

        {/* Tags */}
        {ai.tags && ai.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {ai.tags.slice(0, 4).map((tag, idx) => (
              <View key={idx} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {displayNotes.length > 0 && (
          <View style={styles.notesBlock}>
            {displayNotes.map((note, idx) => (
              <View key={idx} style={styles.noteRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.noteText} numberOfLines={2}>
                  {note}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer branding */}
        <View className="footer" style={styles.footer}>
          <View>
            <Text style={styles.footerBrand}>AI Stylist</Text>
            <Text style={styles.footerSub}>Your personal digital wardrobe</Text>
          </View>
          <Text style={styles.footerHandle}>@ai.stylist.app</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",          // take up parent width
    maxWidth: 360,          // but don't exceed desktop preview size
    aspectRatio: 4 / 5,     // keep IG 4:5 feel on all devices
    borderRadius: 24,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    overflow: "hidden",
  },
  imageWrapper: {
    width: "100%",
    flex: 0.6,              // ~60% of card height for the image
    overflow: "hidden",
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  scoreBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.7)",
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#BBF7D0",
    marginRight: 4,
  },
  scoreLabel: {
    fontSize: 11,
    color: "#6EE7B7",
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  vibeBlock: {
    marginBottom: 6,
  },
  vibeTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 2,
  },
  vibeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
    marginTop: 2,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(55,65,81,0.95)",
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: "#E5E7EB",
  },
  notesBlock: {
    marginBottom: 6,
  },
  noteRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bullet: {
    color: "#9CA3AF",
    marginRight: 4,
    marginTop: 1,
  },
  noteText: {
    fontSize: 11,
    color: "#E5E7EB",
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(31,41,55,0.9)",
    paddingTop: 6,
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  footerSub: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  footerHandle: {
    fontSize: 10,
    color: "#6B7280",
  },
});
