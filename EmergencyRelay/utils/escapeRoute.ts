import { roomsByFloor, STAIRWELL_GROUPS, RoomArea } from '../components/FloorMap';

export interface EscapeStep {
    roomId: string;
    roomName: string;
    floor: number;
    x: number; // center, percentage of floor image (0-100)
    y: number; // center, percentage of floor image (0-100)
    instruction: string;
}

// Rooms don't have an explicit adjacency graph - only bounding boxes per floor - so we
// approximate connectivity: every room connects to the nearest hall on its floor, halls on
// the same floor are all mutually connected, and stairwells connect to the nearest hall plus
// to same-lettered stairwells on adjacent floors. A virtual EXIT node hangs off every floor-1
// hall, modeling "reaching a ground floor hallway means you've reached a way out".
const EXIT = 'EXIT';

function nodeId(floor: number, roomId: string) {
    return `${floor}:${roomId}`;
}

function center(room: RoomArea) {
    return { x: room.x + room.width / 2, y: room.y + room.height / 2 };
}

function distance(a: RoomArea, b: RoomArea) {
    const ca = center(a);
    const cb = center(b);
    return Math.hypot(ca.x - cb.x, ca.y - cb.y);
}

function buildGraph(avoidRoomId?: string) {
    // adjacency: nodeId -> Array<{ to: string; weight: number }>
    const graph = new Map<string, Array<{ to: string; weight: number }>>();
    const add = (a: string, b: string, weight: number) => {
        if (!graph.has(a)) graph.set(a, []);
        if (!graph.has(b)) graph.set(b, []);
        graph.get(a)!.push({ to: b, weight });
        graph.get(b)!.push({ to: a, weight });
    };

    for (const floorStr of Object.keys(roomsByFloor)) {
        const floor = Number(floorStr);
        const rooms = roomsByFloor[floor].filter(r => r.id !== avoidRoomId);
        const halls = rooms.filter(r => r.type === 'hall');

        // Halls on the same floor are all mutually reachable (there are only ever a
        // handful per floor, so a full mesh is simpler and safer than guessing which
        // halls are physically adjacent from bounding boxes alone).
        for (let i = 0; i < halls.length; i++) {
            for (let j = i + 1; j < halls.length; j++) {
                add(nodeId(floor, halls[i].id), nodeId(floor, halls[j].id), distance(halls[i], halls[j]));
            }
        }

        // Every room and stairwell connects to its nearest hall on the same floor.
        for (const room of rooms) {
            if (room.type === 'hall') continue;
            if (halls.length === 0) continue;
            let nearest = halls[0];
            let best = distance(room, nearest);
            for (const hall of halls.slice(1)) {
                const d = distance(room, hall);
                if (d < best) { best = d; nearest = hall; }
            }
            add(nodeId(floor, room.id), nodeId(floor, nearest.id), best);
        }

        // Ground floor halls lead outside.
        if (floor === 1) {
            for (const hall of halls) {
                add(nodeId(floor, hall.id), EXIT, 1);
            }
        }
    }

    // Connect matching stairwells across floors (one flight of stairs = fixed cost so
    // Dijkstra prefers fewer floor changes over longer same-floor detours).
    for (const group of Object.values(STAIRWELL_GROUPS)) {
        const nodesInGroup = group
            .map(id => {
                for (const floorStr of Object.keys(roomsByFloor)) {
                    const floor = Number(floorStr);
                    const room = roomsByFloor[floor].find(r => r.id === id);
                    if (room && room.id !== avoidRoomId) return { floor, id };
                }
                return null;
            })
            .filter((n): n is { floor: number; id: string } => n !== null);
        for (let i = 0; i < nodesInGroup.length; i++) {
            for (let j = i + 1; j < nodesInGroup.length; j++) {
                add(nodeId(nodesInGroup[i].floor, nodesInGroup[i].id), nodeId(nodesInGroup[j].floor, nodesInGroup[j].id), 10);
            }
        }
    }

    return graph;
}

function dijkstra(graph: Map<string, Array<{ to: string; weight: number }>>, start: string, end: string): string[] | null {
    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    const visited = new Set<string>();
    dist.set(start, 0);

    while (true) {
        let current: string | null = null;
        let currentDist = Infinity;
        for (const [node, d] of dist) {
            if (!visited.has(node) && d < currentDist) {
                current = node;
                currentDist = d;
            }
        }
        if (current === null) break;
        if (current === end) break;
        visited.add(current);

        for (const edge of graph.get(current) || []) {
            if (visited.has(edge.to)) continue;
            const next = currentDist + edge.weight;
            if (next < (dist.get(edge.to) ?? Infinity)) {
                dist.set(edge.to, next);
                prev.set(edge.to, current);
            }
        }
    }

    if (!dist.has(end)) return null;
    const path: string[] = [];
    let node: string | undefined = end;
    while (node) {
        path.unshift(node);
        node = prev.get(node);
    }
    return path;
}

// Human-readable summary of a route, e.g. "204 → Side Hall → Main Hall → Stairwell A → Right Hall".
// Collapses consecutive same-named stops (a stairwell has separate waypoints per floor it
// connects, but they share a name, which would otherwise read like "Stairwell A → Stairwell A").
export function summarizeRoute(steps: EscapeStep[]): string {
    return steps
        .map(s => s.roomName)
        .filter((name, i, arr) => name !== arr[i - 1])
        .join(' → ');
}

// Fuzzy-matches a room by name on a given floor (same matching rule FloorMap uses to
// highlight the emergency location), so callers can go from an alert's free-text
// location string to an actual room id.
export function findRoomIdByName(floor: number, name: string): string | null {
    const rooms = roomsByFloor[floor] || [];
    const lowerName = name.toLowerCase();
    const match = rooms.find(r =>
        r.name.toLowerCase().includes(lowerName) || lowerName.includes(r.name.toLowerCase())
    );
    return match ? match.id : null;
}

// Computes the shortest route from a room to the nearest building exit, optionally
// routing around a room to avoid (e.g. the room where an emergency is located).
export function calculateEscapeRoute(startFloor: number, startRoomId: string, avoidRoomId?: string): EscapeStep[] {
    if (avoidRoomId === startRoomId) return [];
    const graph = buildGraph(avoidRoomId);
    const start = nodeId(startFloor, startRoomId);
    if (!graph.has(start)) return [];

    const path = dijkstra(graph, start, EXIT);
    if (!path) return [];

    const roomNodes = path.filter(n => n !== EXIT);
    const steps: EscapeStep[] = roomNodes.map((n, i) => {
        const [floorStr, roomId] = n.split(':');
        const floor = Number(floorStr);
        const room = roomsByFloor[floor].find(r => r.id === roomId)!;
        const c = center(room);
        const isLast = i === roomNodes.length - 1;
        const nextNode = roomNodes[i + 1];
        const changesFloor = nextNode && Number(nextNode.split(':')[0]) !== floor;

        let instruction: string;
        if (i === 0) {
            instruction = `Start at ${room.name}`;
        } else if (isLast) {
            instruction = `Exit the building via ${room.name}`;
        } else if (changesFloor) {
            const nextFloor = Number(nextNode.split(':')[0]);
            instruction = `Take ${room.name} to Floor ${nextFloor}`;
        } else {
            instruction = `Continue to ${room.name}`;
        }

        return { roomId: room.id, roomName: room.name, floor, x: c.x, y: c.y, instruction };
    });

    return steps;
}
