import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  phone: true,
  isAdmin: true,
});

// Cities model
export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const insertCitySchema = createInsertSchema(cities).pick({
  name: true,
});

// Bus model
export const buses = pgTable("buses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // Standard, Luxury
  fromCityId: integer("from_city_id").notNull().references(() => cities.id),
  toCityId: integer("to_city_id").notNull().references(() => cities.id),
  departureTime: text("departure_time").notNull(), // Store as HH:MM format
  arrivalTime: text("arrival_time").notNull(), // Store as HH:MM format
  duration: text("duration").notNull(), // Store as Xh Ym format
  price: integer("price").notNull(), // Store in cents
  totalSeats: integer("total_seats").notNull(),
  amenities: text("amenities").array(), // wifi, ac, refreshments
  rating: integer("rating").default(0),
  reviewCount: integer("review_count").default(0),
});

export const insertBusSchema = createInsertSchema(buses).pick({
  name: true,
  type: true,
  fromCityId: true,
  toCityId: true,
  departureTime: true,
  arrivalTime: true,
  duration: true,
  price: true,
  totalSeats: true,
  amenities: true,
  rating: true,
  reviewCount: true,
});

// Seat layout model
export const seatLayouts = pgTable("seat_layouts", {
  id: serial("id").primaryKey(),
  busId: integer("bus_id").notNull().references(() => buses.id),
  seatNumber: text("seat_number").notNull(), // A1, B2, etc
  rowPosition: integer("row_position").notNull(),
  columnPosition: integer("column_position").notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
});

export const insertSeatLayoutSchema = createInsertSchema(seatLayouts).pick({
  busId: true,
  seatNumber: true,
  rowPosition: true,
  columnPosition: true,
  isVisible: true,
});

// Booking model
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  busId: integer("bus_id").notNull().references(() => buses.id),
  travelDate: text("travel_date").notNull(), // YYYY-MM-DD
  bookingDate: timestamp("booking_date").defaultNow().notNull(),
  status: text("status").notNull(), // confirmed, cancelled
  totalAmount: integer("total_amount").notNull(), // Store in cents
  paymentStatus: text("payment_status").notNull(), // paid, pending
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  userId: true,
  busId: true,
  travelDate: true,
  status: true,
  totalAmount: true,
  paymentStatus: true,
});

// Booking details model (seats booked)
export const bookingDetails = pgTable("booking_details", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  seatNumber: text("seat_number").notNull(),
});

export const insertBookingDetailSchema = createInsertSchema(bookingDetails).pick({
  bookingId: true,
  seatNumber: true,
});

// Scheduled trips model
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  busId: integer("bus_id").notNull().references(() => buses.id),
  date: text("date").notNull(), // YYYY-MM-DD
  availableSeats: integer("available_seats").notNull(),
});

// Composite primary key for unique bus availability on a specific date
export const tripSeatAvailability = pgTable("trip_seat_availability", {
  tripId: integer("trip_id").notNull().references(() => trips.id),
  seatNumber: text("seat_number").notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.tripId, table.seatNumber] }),
  };
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof cities.$inferSelect;

export type InsertBus = z.infer<typeof insertBusSchema>;
export type Bus = typeof buses.$inferSelect;

export type InsertSeatLayout = z.infer<typeof insertSeatLayoutSchema>;
export type SeatLayout = typeof seatLayouts.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertBookingDetail = z.infer<typeof insertBookingDetailSchema>;
export type BookingDetail = typeof bookingDetails.$inferSelect;

export type Trip = typeof trips.$inferSelect;
export type TripSeatAvailability = typeof tripSeatAvailability.$inferSelect;
