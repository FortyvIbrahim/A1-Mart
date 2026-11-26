"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import moment from "moment";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Flex,
  Grid,
  IconButton,
  Input,
  Menu,
  NativeSelect,
  Portal,
  Spinner,
  Text,
} from "@chakra-ui/react";
import {
  LuCircleCheck,
  LuChevronLeft,
  LuChevronRight,
  LuClipboardList,
  LuClock3,
  LuEllipsisVertical,
  LuPlay,
  LuPlus,
} from "react-icons/lu";
import { getTasks, getMyTasks, deleteTask } from "@/api/helpers/tasks";
import usePermission from "@/customHooks/usePermission";
import useDeleteModal from "@/customHooks/useDeleteModal";
import { capitalizeWords } from "@/utils/string";

/* ── Figma "Task Management / All Tasks and My Tasks" ─────────────────── */

const PRIORITIES = [
  { key: "urgent", label: "Urgent Priority", tint: "#FDECEC", color: "#C2410C" },
  { key: "high", label: "High Priority", tint: "#FFF4EC", color: "#D9A13B" },
  { key: "medium", label: "Medium Priority", tint: "#FEF6EE", color: "#C9772F" },
  { key: "low", label: "Low Priority", tint: "#F6F7FB", color: "#5B6CB5" },
];

const STATUS_STYLE = {
  open: { label: "Open", bg: "#FEF3E2", color: "#B7791F" },
  in_progress: { label: "In Progress", bg: "#EAF0FF", color: "#3D5AC0" },
  done: { label: "Done", bg: "#E8F6EE", color: "#2F855A" },
  closed: { label: "Closed", bg: "#FDECEC", color: "#C53030" },
};

const SORTS = {
  created_desc: { label: "Created Date", fn: (a, b) => dateOf(b) - dateOf(a) },
  created_asc: { label: "Oldest first", fn: (a, b) => dateOf(a) - dateOf(b) },
  title: {
    label: "Title (A–Z)",
    fn: (a, b) => String(a.title || "").localeCompare(String(b.title || "")),
  },
};

function dateOf(task) {
  const t = task?.created_at ? new Date(task.created_at).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function taskCode(task) {
  return `TASK-${String(task.task_id ?? "").padStart(3, "0")}`;
}

function normalize(tasks) {
  return (Array.isArray(tasks) ? tasks : []).map((t) => ({
    ...t,
    status: String(t.status || "open").toLowerCase(),
    priority: String(t.priority || "medium").toLowerCase(),
  }));
}

async function loadList(fetcher) {
  const res = await fetcher();
  if (Array.isArray(res)) return normalize(res);
  if (res?.code === 200) return normalize(res.data);
  throw new Error(res?.msg || res?.message || "Failed to fetch tasks");
}

/* ── Small building blocks ───────────────────────────────────────────── */

function MetricCard({ icon: Icon, value, label }) {
  return (
    <Flex
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="14px"
      px="20px"
      py="16px"
      gap="16px"
      alignItems="center"
      minW={0}
    >
      <Box color="brand.500" flexShrink={0}>
        <Icon size={22} />
      </Box>
      <Box minW={0}>
        <Text fontSize="24px" fontWeight="700" color="gray.800" lineHeight="1.1">
          {value}
        </Text>
        <Text fontSize="13px" color="gray.500" mt="2px">
          {label}
        </Text>
      </Box>
    </Flex>
  );
}

function FilterField({ label, children }) {
  return (
    <Box minW={0}>
      <Text fontSize="12.5px" fontWeight="500" color="gray.600" mb="6px">
        {label}
      </Text>
      {children}
    </Box>
  );
}

function SelectBox({ value, onChange, children }) {
  return (
    <NativeSelect.Root>
      <NativeSelect.Field
        h="40px"
        fontSize="13px"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        color={value ? "gray.800" : "gray.500"}
      >
        {children}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? {
    label: capitalizeWords(String(status).replace(/_/g, " ")),
    bg: "#F3F4F6",
    color: "#4B5563",
  };
  return (
    <Box
      as="span"
      px="8px"
      py="2px"
      borderRadius="6px"
      fontSize="11px"
      fontWeight="600"
      bg={s.bg}
      color={s.color}
      whiteSpace="nowrap"
    >
      {s.label}
    </Box>
  );
}

function TaskCard({ task, actions }) {
  return (
    <Flex
      direction="column"
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="12px"
      px="14px"
      py="12px"
      w={{ base: "260px", md: "232px" }}
      minH="120px"
      flexShrink={0}
      transition="box-shadow 0.15s ease, border-color 0.15s ease"
      _hover={{ boxShadow: "0 6px 18px rgba(244,119,33,0.10)", borderColor: "brand.200" }}
    >
      <Flex alignItems="center" gap="6px">
        <Text fontSize="11px" color="gray.500" flex={1} letterSpacing="0.02em">
          {taskCode(task)}
        </Text>
        <StatusBadge status={task.status} />
        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Menu.Trigger asChild>
            <IconButton
              variant="ghost"
              size="2xs"
              aria-label="Task actions"
              color="gray.500"
              mr="-6px"
            >
              <LuEllipsisVertical />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content
                minW="150px"
                p="4px"
                borderRadius="10px"
                bg="white"
                borderWidth="1px"
                borderColor="border"
                boxShadow="0 12px 28px rgba(31,41,55,0.12)"
              >
                {actions.map((a) => (
                  <Menu.Item
                    key={a.value}
                    value={a.value}
                    onSelect={a.onClick}
                    fontSize="13px"
                    borderRadius="7px"
                    cursor="pointer"
                    color={a.danger ? "red.600" : "gray.700"}
                    _hover={{ bg: a.danger ? "red.50" : "brand.50" }}
                  >
                    {a.label}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Flex>

      <Link href={actions[0]?.href ?? "#"}>
        <Text
          mt="6px"
          fontSize="14px"
          fontWeight="600"
          color="gray.800"
          lineClamp={2}
          _hover={{ color: "brand.600" }}
        >
          {capitalizeWords(task.title ?? "")}
        </Text>
      </Link>

      <Box mt="auto" pt="14px">
        <Flex fontSize="11.5px" gap="6px" alignItems="baseline" minW={0}>
          <Text color="gray.500" flexShrink={0}>
            Assigned to
          </Text>
          <Text color="gray.800" fontWeight="600" textTransform="uppercase" truncate>
            {task.assigned_to_name || "Unassigned"}
          </Text>
        </Flex>
        <Flex mt="4px" fontSize="11px" color="gray.500" justifyContent="space-between" gap="8px">
          <Text textTransform="uppercase" truncate>
            {task.created_by_name || "—"}
          </Text>
          <Text flexShrink={0}>
            {task.created_at ? moment(task.created_at).format("DD/MM/YYYY") : ""}
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
}

function PriorityLane({ priority, tasks, actionsFor }) {
  const scroller = useRef(null);
  const scrollBy = (dir) =>
    scroller.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  return (
    <Flex
      bg={priority.tint}
      borderRadius="16px"
      p={{ base: "12px", md: "14px" }}
      gap="14px"
      direction={{ base: "column", md: "row" }}
      alignItems={{ base: "stretch", md: "center" }}
    >
      <Box w={{ base: "auto", md: "140px" }} flexShrink={0} px="4px" whiteSpace="nowrap">
        <Text fontSize="15px" fontWeight="700" color={priority.color}>
          {priority.label}
        </Text>
        <Text fontSize="12px" color="gray.500" mt="4px">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </Text>
      </Box>

      <Flex
        ref={scroller}
        flex={1}
        minW={0}
        gap="12px"
        overflowX="auto"
        py="2px"
        css={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
      >
        {tasks.map((t) => (
          <TaskCard key={t.task_id} task={t} actions={actionsFor(t)} />
        ))}
      </Flex>

      {tasks.length > 3 && (
        <Flex gap="6px" alignSelf={{ base: "flex-end", md: "flex-start" }} flexShrink={0}>
          <IconButton
            size="xs"
            variant="outline"
            aria-label="Scroll left"
            borderColor="border"
            color="brand.500"
            bg="white"
            onClick={() => scrollBy(-1)}
          >
            <LuChevronLeft />
          </IconButton>
          <IconButton
            size="xs"
            aria-label="Scroll right"
            bg="brand.100"
            color="brand.600"
            _hover={{ bg: "brand.200" }}
            onClick={() => scrollBy(1)}
          >
            <LuChevronRight />
          </IconButton>
        </Flex>
      )}
    </Flex>
  );
}

/* ── Board ───────────────────────────────────────────────────────────── */

/**
 * Shared board for /tasks (All Tasks) and /tasks/mine (My Tasks).
 * Data still comes from GET /tasks and GET /tasks/my; actions route to the
 * existing view/edit pages and DELETE /tasks/:id.
 */
export default function TaskBoard({ mode = "all" }) {
  const router = useRouter();
  const canViewAll = usePermission("view_tasks");
  const canViewMine = usePermission("view_my_tasks");
  const canAdd = usePermission("add_tasks");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const [allTasks, setAllTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [sort, setSort] = useState("created_desc");
  const [thisMonth, setThisMonth] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [all, mine] = await Promise.all([
        canViewAll ? loadList(getTasks) : Promise.resolve([]),
        canViewMine ? loadList(getMyTasks) : Promise.resolve([]),
      ]);
      setAllTasks(all);
      setMyTasks(mine);
    } catch (err) {
      console.log(err);
      toast.error("Error fetching tasks!");
    } finally {
      setLoading(false);
    }
  }, [canViewAll, canViewMine]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const source = mode === "mine" ? myTasks : allTasks;

  const assignees = useMemo(
    () =>
      [...new Set(source.map((t) => t.assigned_to_name).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [source]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const monthStart = moment().startOf("month").valueOf();
    return source
      .filter((t) => {
        if (status && t.status !== status) return false;
        if (priority && t.priority !== priority) return false;
        if (assignee && t.assigned_to_name !== assignee) return false;
        if (thisMonth && dateOf(t) < monthStart) return false;
        if (q) {
          const hay = `${taskCode(t)} ${t.task_id} ${t.title ?? ""} ${t.description ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort(SORTS[sort].fn);
  }, [source, search, status, priority, assignee, sort, thisMonth]);

  const metrics = useMemo(
    () => ({
      total: source.length,
      pending: source.filter((t) => t.status === "open").length,
      inProgress: source.filter((t) => t.status === "in_progress").length,
      completed: source.filter((t) => t.status === "done" || t.status === "closed").length,
    }),
    [source]
  );

  const actionsFor = (task) => {
    const suffix = mode === "mine" ? "?type=my" : "";
    const list = [
      {
        value: "view",
        label: "View",
        href: `/tasks/view/${task.task_id}${suffix}`,
        onClick: () => router.push(`/tasks/view/${task.task_id}${suffix}`),
      },
      {
        value: "edit",
        label: "Edit",
        href: `/tasks/edit/${task.task_id}${suffix}`,
        onClick: () => router.push(`/tasks/edit/${task.task_id}${suffix}`),
      },
    ];
    if (mode === "all" && canAdd) {
      list.push({
        value: "delete",
        label: "Delete",
        danger: true,
        onClick: () =>
          openDeleteModal({
            title: "Delete Task",
            message: "Are you sure you want to delete this task?",
            onDelete: async () => {
              try {
                const res = await deleteTask(task.task_id);
                if (res?.code && res.code !== 200) throw new Error(res.msg);
                toast.success("Task deleted");
                refresh();
              } catch (e) {
                toast.error(e?.message || "Failed to delete task");
              }
            },
          }),
      });
    }
    return list;
  };

  const title = mode === "mine" ? "My Tasks" : "All Tasks";
  const subtitle =
    mode === "mine"
      ? "Tasks assigned to you, grouped by priority."
      : "Manage tasks assigned across the team.";

  const lanes = PRIORITIES.map((p) => ({
    priority: p,
    tasks: filtered.filter((t) => t.priority === p.key),
  })).filter((l) => l.tasks.length > 0);
  const otherTasks = filtered.filter((t) => !PRIORITIES.some((p) => p.key === t.priority));
  if (otherTasks.length) {
    lanes.push({
      priority: { key: "other", label: "Other", tint: "#F9FAFB", color: "#4B5563" },
      tasks: otherTasks,
    });
  }

  return (
    <Flex direction="column" gap="18px">
      <DeleteModalComponent />

      {/* Title row */}
      <Flex alignItems="flex-start" justifyContent="space-between" gap="12px" flexWrap="wrap">
        <Box>
          <Text as="h1" fontSize={{ base: "22px", md: "30px" }} fontWeight="600" color="gray.800" letterSpacing="-0.02em">
            {title}
          </Text>
          <Text mt="4px" fontSize="13.5px" color="gray.500">
            {subtitle}
          </Text>
        </Box>
        {canAdd && (
          <Link href="/tasks/create">
            <Button h="40px" px="20px" fontSize="13.5px" bg="brand.500" color="white" _hover={{ bg: "brand.600" }}>
              <LuPlus /> Add Task
            </Button>
          </Link>
        )}
      </Flex>

      {/* Metrics */}
      <Grid templateColumns={{ base: "repeat(2, minmax(0,1fr))", lg: "repeat(4, minmax(0,1fr))" }} gap="14px">
        <MetricCard icon={LuClipboardList} value={metrics.total} label="Total Tasks" />
        <MetricCard icon={LuClock3} value={metrics.pending} label="Pending" />
        <MetricCard icon={LuPlay} value={metrics.inProgress} label="In Progress" />
        <MetricCard icon={LuCircleCheck} value={metrics.completed} label="Completed" />
      </Grid>

      {/* All / My toggle + period */}
      <Flex justifyContent="space-between" alignItems="center" gap="10px" flexWrap="wrap">
        <Flex gap="8px">
          {canViewAll && (
            <Link href="/tasks">
              <Box
                px="16px"
                py="9px"
                borderRadius="10px"
                fontSize="13px"
                fontWeight="600"
                bg={mode === "all" ? "brand.500" : "white"}
                color={mode === "all" ? "white" : "gray.700"}
                boxShadow={mode === "all" ? "0 4px 12px rgba(244,119,33,0.25)" : "0 1px 2px rgba(31,41,55,0.05)"}
              >
                All Tasks ({allTasks.length})
              </Box>
            </Link>
          )}
          {canViewMine && (
            <Link href="/tasks/mine">
              <Box
                px="16px"
                py="9px"
                borderRadius="10px"
                fontSize="13px"
                fontWeight="600"
                bg={mode === "mine" ? "brand.500" : "white"}
                color={mode === "mine" ? "white" : "gray.700"}
                boxShadow={mode === "mine" ? "0 4px 12px rgba(244,119,33,0.25)" : "0 1px 2px rgba(31,41,55,0.05)"}
              >
                My Tasks ({myTasks.length})
              </Box>
            </Link>
          )}
        </Flex>
        <Button
          size="sm"
          h="38px"
          px="16px"
          variant="outline"
          bg={thisMonth ? "brand.50" : "white"}
          borderColor={thisMonth ? "brand.300" : "border"}
          color={thisMonth ? "brand.600" : "gray.700"}
          onClick={() => setThisMonth((v) => !v)}
          aria-pressed={thisMonth}
        >
          {thisMonth ? "This Month" : "All Time"}
        </Button>
      </Flex>

      {/* Filters */}
      <Box bg="white" borderRadius="14px" borderWidth="1px" borderColor="border" px="18px" py="16px">
        <Grid templateColumns={{ base: "1fr", sm: "repeat(2, minmax(0,1fr))", lg: "repeat(4, minmax(0,1fr))" }} gap="14px">
          <FilterField label="Search">
            <Input
              h="40px"
              fontSize="13px"
              placeholder="Search task id or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FilterField>
          <FilterField label="Status">
            <SelectBox value={status} onChange={setStatus}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_STYLE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </SelectBox>
          </FilterField>
          <FilterField label="Priority">
            <SelectBox value={priority} onChange={setPriority}>
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p.key} value={p.key}>
                  {capitalizeWords(p.key)}
                </option>
              ))}
            </SelectBox>
          </FilterField>
          <FilterField label="Assigned To">
            <SelectBox value={assignee} onChange={setAssignee}>
              <option value="">All employees</option>
              {assignees.map((a) => (
                <option key={a} value={a}>
                  {capitalizeWords(a)}
                </option>
              ))}
            </SelectBox>
          </FilterField>
          <FilterField label="Sort by">
            <SelectBox value={sort} onChange={setSort}>
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </SelectBox>
          </FilterField>
        </Grid>
      </Box>

      {/* Lanes */}
      {loading ? (
        <Flex justifyContent="center" py="40px">
          <Spinner color="brand.500" />
        </Flex>
      ) : lanes.length === 0 ? (
        <Flex
          direction="column"
          alignItems="center"
          gap="6px"
          bg="white"
          borderWidth="1px"
          borderColor="border"
          borderRadius="14px"
          py="36px"
        >
          <Text fontSize="15px" fontWeight="600" color="gray.700">
            No tasks found
          </Text>
          <Text fontSize="13px" color="gray.500">
            {source.length ? "Try clearing the filters." : "Tasks will appear here once they are created."}
          </Text>
        </Flex>
      ) : (
        <Flex direction="column" gap="14px">
          {lanes.map((lane) => (
            <PriorityLane
              key={lane.priority.key}
              priority={lane.priority}
              tasks={lane.tasks}
              actionsFor={actionsFor}
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
}
