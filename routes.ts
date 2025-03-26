import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertBusSchema, 
  insertBookingSchema, 
  insertBookingDetailSchema, 
  insertCitySchema 
} from "@shared/schema";

// Middleware to check if user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};

// Middleware to check if user is admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // City routes
  app.get("/api/cities", async (req, res) => {
    try {
      const cities = await storage.getAllCities();
      res.json(cities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cities", error });
    }
  });

  app.post("/api/cities", isAdmin, async (req, res) => {
    try {
      const validatedData = insertCitySchema.parse(req.body);
      const city = await storage.createCity(validatedData);
      res.status(201).json(city);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create city", error });
    }
  });

  // Bus routes
  app.get("/api/buses", async (req, res) => {
    try {
      const { from, to, date, priceRange } = req.query;
      
      // Validate input parameters
      if (from || to || date) {
        const buses = await storage.searchBuses({
          fromCityId: from ? Number(from) : undefined,
          toCityId: to ? Number(to) : undefined,
          date: date as string | undefined,
          priceRange: priceRange as string | undefined
        });
        return res.json(buses);
      }
      
      const buses = await storage.getAllBuses();
      res.json(buses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch buses", error });
    }
  });

  app.post("/api/buses", isAdmin, async (req, res) => {
    try {
      const validatedData = insertBusSchema.parse(req.body);
      const bus = await storage.createBus(validatedData);
      res.status(201).json(bus);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bus", error });
    }
  });

  app.get("/api/buses/:id", async (req, res) => {
    try {
      const busId = parseInt(req.params.id);
      if (isNaN(busId)) {
        return res.status(400).json({ message: "Invalid bus ID" });
      }
      
      const bus = await storage.getBus(busId);
      if (!bus) {
        return res.status(404).json({ message: "Bus not found" });
      }
      
      res.json(bus);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bus", error });
    }
  });

  app.put("/api/buses/:id", isAdmin, async (req, res) => {
    try {
      const busId = parseInt(req.params.id);
      if (isNaN(busId)) {
        return res.status(400).json({ message: "Invalid bus ID" });
      }
      
      const validatedData = insertBusSchema.parse(req.body);
      const bus = await storage.updateBus(busId, validatedData);
      if (!bus) {
        return res.status(404).json({ message: "Bus not found" });
      }
      
      res.json(bus);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update bus", error });
    }
  });

  app.delete("/api/buses/:id", isAdmin, async (req, res) => {
    try {
      const busId = parseInt(req.params.id);
      if (isNaN(busId)) {
        return res.status(400).json({ message: "Invalid bus ID" });
      }
      
      const success = await storage.deleteBus(busId);
      if (!success) {
        return res.status(404).json({ message: "Bus not found" });
      }
      
      res.json({ message: "Bus deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bus", error });
    }
  });

  // Seat availability routes
  app.get("/api/buses/:id/seats", async (req, res) => {
    try {
      const busId = parseInt(req.params.id);
      const date = req.query.date as string;
      
      if (isNaN(busId) || !date) {
        return res.status(400).json({ message: "Invalid bus ID or missing date" });
      }
      
      const seatAvailability = await storage.getSeatAvailability(busId, date);
      res.json(seatAvailability);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seat availability", error });
    }
  });

  // Booking routes
  app.post("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      // Extend validation schema for the booking with selected seats
      const bookingWithSeatsSchema = z.object({
        booking: insertBookingSchema,
        seats: z.array(z.string())
      });
      
      const { booking, seats } = bookingWithSeatsSchema.parse(req.body);
      
      // Add the current user ID to the booking
      booking.userId = req.user.id;
      
      // Create the booking
      const newBooking = await storage.createBooking(booking, seats);
      res.status(201).json(newBooking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking", error });
    }
  });

  app.get("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      // Admin can see all bookings, users can only see their own
      if (req.user.isAdmin) {
        const bookings = await storage.getAllBookings();
        return res.json(bookings);
      }
      
      const bookings = await storage.getUserBookings(req.user.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings", error });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if the user is authorized to view this booking
      if (!req.user.isAdmin && booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking", error });
    }
  });

  app.post("/api/bookings/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if the user is authorized to cancel this booking
      if (!req.user.isAdmin && booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updatedBooking = await storage.cancelBooking(bookingId);
      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel booking", error });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send passwords to client
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users", error });
    }
  });

  app.get("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password to client
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user", error });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
