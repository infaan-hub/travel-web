import "server-only";
import { ApiError } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import type { WorkspaceCreateInput } from "@/lib/validation/schemas";
import type { WorkspaceStatus } from "@prisma/client";

export const WORKSPACE_INCLUDE = {
  tourist: true,
  selectedHotel: true,
  selectedTravelDriver: true,
  selectedTravelVehicle: true,
  selectedTours: true,
  selectedRooms: true,
  tasks: true,
} as const;

export async function getWorkspace(id: number) {
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: WORKSPACE_INCLUDE,
  });
  if (!workspace) throw new ApiError(404, "Workspace not found.");
  return workspace;
}

function normalizeRoomIds(rooms: WorkspaceCreateInput["selected_rooms"]): number[] {
  return (rooms ?? []).map((room) => (typeof room === "number" ? room : room.id));
}

export async function createWorkspace(input: WorkspaceCreateInput) {
  const touristId = input.tourist ?? input.tourist_id ?? null;
  if (touristId) {
    const tourist = await prisma.user.findUnique({ where: { id: touristId } });
    if (!tourist) throw new ApiError(400, "Selected tourist does not exist.");
  }
  if (input.selected_hotel) {
    const hotel = await prisma.hotel.findUnique({ where: { id: input.selected_hotel } });
    if (!hotel) throw new ApiError(400, "Selected hotel does not exist.");
  }
  if (input.selected_travel_driver) {
    const driver = await prisma.travelDriver.findUnique({
      where: { id: input.selected_travel_driver },
    });
    if (!driver) throw new ApiError(400, "Selected driver does not exist.");
  }
  if (input.selected_travel_vehicle) {
    const vehicle = await prisma.travelVehicle.findUnique({
      where: { id: input.selected_travel_vehicle },
    });
    if (!vehicle) throw new ApiError(400, "Selected vehicle does not exist.");
  }

  const tourIds = input.selected_tours ?? [];
  const roomIds = normalizeRoomIds(input.selected_rooms);

  return prisma.workspace.create({
    data: {
      touristId,
      touristName: input.tourist_name ?? "",
      touristEmail: input.tourist_email ?? "",
      selectedHotelId: input.selected_hotel ?? null,
      selectedTravelDriverId: input.selected_travel_driver ?? null,
      selectedTravelVehicleId: input.selected_travel_vehicle ?? null,
      totalPrice: input.total_price ?? null,
      notes: input.notes ?? "",
      status: (input.status as WorkspaceStatus | undefined) ?? "draft",
      selectedTours: tourIds.length ? { connect: tourIds.map((id) => ({ id })) } : undefined,
      selectedRooms: roomIds.length ? { connect: roomIds.map((id) => ({ id })) } : undefined,
    },
    include: WORKSPACE_INCLUDE,
  });
}

export async function updateWorkspace(
  id: number,
  input: Partial<WorkspaceCreateInput>,
) {
  await getWorkspace(id);
  const touristId = input.tourist ?? input.tourist_id;
  const data: Record<string, unknown> = {};

  if (touristId !== undefined) data.touristId = touristId;
  if (input.tourist_name !== undefined) data.touristName = input.tourist_name;
  if (input.tourist_email !== undefined) data.touristEmail = input.tourist_email;
  if (input.selected_hotel !== undefined) data.selectedHotelId = input.selected_hotel;
  if (input.selected_travel_driver !== undefined) {
    data.selectedTravelDriverId = input.selected_travel_driver;
  }
  if (input.selected_travel_vehicle !== undefined) {
    data.selectedTravelVehicleId = input.selected_travel_vehicle;
  }
  if (input.total_price !== undefined) data.totalPrice = input.total_price;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status !== undefined) data.status = input.status;

  if (input.selected_tours !== undefined) {
    data.selectedTours = { set: input.selected_tours.map((tourId) => ({ id: tourId })) };
  }
  if (input.selected_rooms !== undefined) {
    const roomIds = normalizeRoomIds(input.selected_rooms);
    data.selectedRooms = { set: roomIds.map((roomId) => ({ id: roomId })) };
  }

  return prisma.workspace.update({ where: { id }, data, include: WORKSPACE_INCLUDE });
}

export async function addTourToWorkspace(workspaceId: number, tourId: number) {
  await getWorkspace(workspaceId);
  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour) throw new ApiError(404, "Tour not found.");
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { selectedTours: { connect: { id: tourId } } },
    include: WORKSPACE_INCLUDE,
  });
}

export async function removeTourFromWorkspace(workspaceId: number, tourId: number) {
  await getWorkspace(workspaceId);
  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour) throw new ApiError(404, "Tour not found.");
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { selectedTours: { disconnect: { id: tourId } } },
    include: WORKSPACE_INCLUDE,
  });
}

export async function setWorkspaceHotel(workspaceId: number, hotelId: number) {
  await getWorkspace(workspaceId);
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) throw new ApiError(404, "Hotel not found.");
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { selectedHotelId: hotelId },
    include: WORKSPACE_INCLUDE,
  });
}

/**
 * Canonical hotel removal route.
 * never existed; this is the supported replacement.
 */
export async function removeWorkspaceHotel(workspaceId: number, hotelId: number) {
  const workspace = await getWorkspace(workspaceId);
  if (workspace.selectedHotelId !== hotelId) {
    throw new ApiError(400, "That hotel is not selected for this workspace.");
  }
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { selectedHotelId: null },
    include: WORKSPACE_INCLUDE,
  });
}

export async function addRoomToWorkspace(workspaceId: number, roomId: number) {
  await getWorkspace(workspaceId);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new ApiError(404, "Room not found.");
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { selectedRooms: { connect: { id: roomId } } },
    include: WORKSPACE_INCLUDE,
  });
}

export async function removeRoomFromWorkspace(workspaceId: number, roomId: number) {
  await getWorkspace(workspaceId);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new ApiError(404, "Room not found.");
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { selectedRooms: { disconnect: { id: roomId } } },
    include: WORKSPACE_INCLUDE,
  });
}

export async function setWorkspaceTravel(
  workspaceId: number,
  data: { driver_id?: number | null; vehicle_id?: number | null },
) {
  await getWorkspace(workspaceId);
  const update: Record<string, unknown> = {};
  if (data.driver_id !== undefined) {
    if (data.driver_id === null) {
      update.selectedTravelDriverId = null;
    } else {
      const driver = await prisma.travelDriver.findUnique({ where: { id: data.driver_id } });
      if (!driver) throw new ApiError(404, "Driver not found.");
      update.selectedTravelDriverId = data.driver_id;
    }
  }
  if (data.vehicle_id !== undefined) {
    if (data.vehicle_id === null) {
      update.selectedTravelVehicleId = null;
    } else {
      const vehicle = await prisma.travelVehicle.findUnique({ where: { id: data.vehicle_id } });
      if (!vehicle) throw new ApiError(404, "Vehicle not found.");
      update.selectedTravelVehicleId = data.vehicle_id;
    }
  }
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: update,
    include: WORKSPACE_INCLUDE,
  });
}

export async function removeWorkspaceTravel(workspaceId: number, type: string) {
  await getWorkspace(workspaceId);
  if (type === "driver") {
    return prisma.workspace.update({
      where: { id: workspaceId },
      data: { selectedTravelDriverId: null },
      include: WORKSPACE_INCLUDE,
    });
  }
  if (type === "vehicle") {
    return prisma.workspace.update({
      where: { id: workspaceId },
      data: { selectedTravelVehicleId: null },
      include: WORKSPACE_INCLUDE,
    });
  }
  throw new ApiError(400, "Travel type must be 'driver' or 'vehicle'.");
}

export async function setWorkspacePricing(
  workspaceId: number,
  data: { total_price?: number; message_sent?: boolean; status?: WorkspaceStatus },
) {
  await getWorkspace(workspaceId);
  const update: Record<string, unknown> = {};
  if (data.total_price !== undefined) update.totalPrice = data.total_price;
  if (data.message_sent !== undefined) update.messageSent = data.message_sent;
  if (data.status !== undefined) update.status = data.status;
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: update,
    include: WORKSPACE_INCLUDE,
  });
}

export async function listWorkspaceTasks(workspaceId: number) {
  await getWorkspace(workspaceId);
  return prisma.workspaceTask.findMany({
    where: { workspaceId },
    orderBy: [{ day: "asc" }, { createdAt: "asc" }],
  });
}

export async function createWorkspaceTask(
  workspaceId: number,
  data: { day: number; title: string; description?: string; completed?: boolean },
) {
  await getWorkspace(workspaceId);
  return prisma.workspaceTask.create({
    data: {
      workspaceId,
      day: data.day,
      title: data.title,
      description: data.description ?? "",
      completed: data.completed ?? false,
    },
  });
}

export async function getWorkspaceTask(workspaceId: number, taskId: number) {
  const task = await prisma.workspaceTask.findFirst({
    where: { id: taskId, workspaceId },
  });
  if (!task) throw new ApiError(404, "Task not found.");
  return task;
}

export async function updateWorkspaceTask(
  workspaceId: number,
  taskId: number,
  data: { day?: number; title?: string; description?: string; completed?: boolean },
) {
  await getWorkspaceTask(workspaceId, taskId);
  const update: Record<string, unknown> = {};
  if (data.day !== undefined) update.day = data.day;
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.completed !== undefined) update.completed = data.completed;
  return prisma.workspaceTask.update({ where: { id: taskId }, data: update });
}

export async function deleteWorkspaceTask(workspaceId: number, taskId: number) {
  await getWorkspaceTask(workspaceId, taskId);
  await prisma.workspaceTask.delete({ where: { id: taskId } });
}
