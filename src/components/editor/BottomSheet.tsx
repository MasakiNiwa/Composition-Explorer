import { ActionIcon, Box, Group, ScrollArea, Text, Tooltip } from '@mantine/core';
import { IconChevronDown, IconEye, IconEyeOff, type Icon } from '@tabler/icons-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent as RPE } from 'react';

/** Snap heights as fractions of the container height. */
const SNAPS = { half: 0.48, full: 0.94 } as const;
type Snap = keyof typeof SNAPS;
const CLOSE_BELOW = 0.2;

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: Icon;
  translucent: boolean;
  onToggleTranslucent: () => void;
  labels: { close: string; translucent: string };
  children: ReactNode;
}

/**
 * Bottom sheet overlaying the canvas (the canvas keeps its size).
 * Swipe the handle up/down to resize; swipe down to close. Optional
 * translucency lets you watch the canvas through the sheet while editing.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  icon: I,
  translucent,
  onToggleTranslucent,
  labels,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);
  const [snap, setSnap] = useState<Snap>('half');
  const [height, setHeight] = useState(0); // px, animated
  const [mounted, setMounted] = useState(open);
  const drag = useRef<{ startY: number; startH: number; lastY: number; lastT: number; v: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Track the available height (parent element).
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => setContainerH(parent.clientHeight));
    ro.observe(parent);
    setContainerH(parent.clientHeight);
    return () => ro.disconnect();
  }, [mounted]);

  // Open / close with animation.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setSnap('half');
    } else setHeight(0);
  }, [open]);
  useEffect(() => {
    if (!open || !mounted || containerH === 0 || dragging) return;
    const id = requestAnimationFrame(() => setHeight(containerH * SNAPS[snap]));
    return () => cancelAnimationFrame(id);
  }, [open, mounted, containerH, snap, dragging]);

  const onDown = (e: RPE<HTMLDivElement>) => {
    if ((e.target as Element).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startH: height, lastY: e.clientY, lastT: performance.now(), v: 0 };
    setDragging(true);
  };
  const onMove = (e: RPE<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    d.v = (e.clientY - d.lastY) / Math.max(1, now - d.lastT); // px/ms, + = down
    d.lastY = e.clientY;
    d.lastT = now;
    setHeight(Math.max(0, Math.min(containerH * SNAPS.full, d.startH - (e.clientY - d.startY))));
  };
  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    const frac = height / Math.max(1, containerH);
    // Flick gestures win over position.
    if (d.v > 0.6) {
      if (snap === 'full' && frac > SNAPS.half * 0.9) setSnap('half');
      else onClose();
      return;
    }
    if (d.v < -0.6) {
      setSnap('full');
      return;
    }
    if (frac < CLOSE_BELOW) onClose();
    else setSnap(Math.abs(frac - SNAPS.half) <= Math.abs(frac - SNAPS.full) ? 'half' : 'full');
  };

  if (!mounted) return null;
  return (
    <Box
      ref={ref}
      onTransitionEnd={(e) => e.target === e.currentTarget && !open && setMounted(false)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -4px 18px rgba(0,0,0,0.18)',
        background: translucent
          ? 'color-mix(in srgb, var(--mantine-color-body) 72%, transparent)'
          : 'var(--mantine-color-body)',
        transition: dragging ? 'none' : 'height 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ touchAction: 'none', cursor: 'grab', flexShrink: 0, userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <Box
          mx="auto"
          mt={6}
          w={40}
          h={5}
          style={{ borderRadius: 3, background: 'var(--mantine-color-default-border)' }}
        />
        <Group justify="space-between" px="sm" py={4} wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <I size={18} />
            <Text fw={600} size="sm">
              {title}
            </Text>
          </Group>
          <Group gap={2} wrap="nowrap">
            <Tooltip label={labels.translucent}>
              <ActionIcon
                variant={translucent ? 'light' : 'subtle'}
                color="gray"
                aria-label={labels.translucent}
                aria-pressed={translucent}
                onClick={onToggleTranslucent}
              >
                {translucent ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </ActionIcon>
            </Tooltip>
            <ActionIcon variant="subtle" color="gray" aria-label={labels.close} onClick={onClose}>
              <IconChevronDown size={20} />
            </ActionIcon>
          </Group>
        </Group>
      </div>
      <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto" offsetScrollbars>
        <Box px="sm" pb="md">
          {children}
        </Box>
      </ScrollArea>
    </Box>
  );
}
