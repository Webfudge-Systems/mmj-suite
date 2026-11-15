import { Badge, type Tone } from "@webfudge/ui";
import type { OrderStatus } from "@webfudge/utils/api";
import { ORDER_STATUS_LABELS } from "@webfudge/utils/api";

const tones: Record<OrderStatus, Tone> = { received: "neutral", in_work: "navy", ready: "gold", delivered: "ok", cancelled: "neutral" };

export function OrderBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={tones[status]} dot>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
