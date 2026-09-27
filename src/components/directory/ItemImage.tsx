import { useState } from "react";
import { Bot } from "lucide-react";
import { imageUrl, type CatalogItem, type CatalogKind } from "./directoryTypes";

const ItemImage = ({ kind, item, large = false }: { kind: CatalogKind; item: CatalogItem; large?: boolean }) => {
  const [failed, setFailed] = useState(false);
  const file = large ? item.img : item.th || item.img;
  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <Bot className="h-10 w-10" />
      </div>
    );
  }
  return (
    <img
      src={imageUrl(kind, file)}
      alt={`${item.n} image`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full w-full object-contain"
    />
  );
};

export default ItemImage;
