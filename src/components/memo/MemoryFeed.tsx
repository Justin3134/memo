import { motion } from "framer-motion";

const memories = [
  { date: "Feb 20", quote: "Tommy reminded me of your father when he was young...", tag: "Family", tagColor: "bg-memo-sage-light text-primary" },
  { date: "Feb 19", quote: "The doctor said my blood pressure is much better now.", tag: "Health", tagColor: "bg-memo-amber-light text-accent-foreground" },
  { date: "Feb 18", quote: "I made that lemon cake recipe you sent me. Turned out wonderful!", tag: "Daily Life", tagColor: "bg-secondary text-secondary-foreground" },
  { date: "Feb 17", quote: "The birds are back in the garden. I counted seven this morning.", tag: "Daily Life", tagColor: "bg-secondary text-secondary-foreground" },
  { date: "Feb 16", quote: "I've been thinking about that trip we took to the coast...", tag: "Family", tagColor: "bg-memo-sage-light text-primary" },
  { date: "Feb 15", quote: "My neighbor Helen brought over some soup. Very kind of her.", tag: "Daily Life", tagColor: "bg-secondary text-secondary-foreground" },
];

export function MemoryFeed() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <h3 className="text-lg font-display font-semibold text-foreground mb-1">Memory Bank</h3>
      <p className="text-sm text-muted-foreground mb-5">Highlights from recent conversations</p>
      <div className="space-y-3 max-h-[360px] overflow-y-auto memo-scrollbar pr-2">
        {memories.map((memory, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">{memory.date}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${memory.tagColor}`}>
                {memory.tag}
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed italic">"{memory.quote}"</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
