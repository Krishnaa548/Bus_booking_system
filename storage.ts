import { 
  User, InsertUser, 
  Bus, InsertBus, 
  City, InsertCity,
  Booking, InsertBooking,
  BookingDetail, InsertBookingDetail,
  SeatLayout, InsertSeatLayout,
  Trip, TripSeatAvailability
} from "@shared/schema";

// Define interfaces for search parameters
export interface SearchBusParams {
  fromCityId?: number;
  toCityId?: number;
  date?: string;
  priceRange?: string;
}

export interface SeatAvailability {
  seatNumber: string;
  isAvailable: boolean;
  rowPosition: number;
  columnPosition: number;
  isVisible: boolean;
}

export interface BookingWithDetails extends Booking {
  bus: Bus;
  fromCity: City;
  toCity: City;
  seats: string[];
}

export interface BusWithCities extends Bus {
  fromCity: City;
  toCity: City;
}

// Define storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // City operations
  createCity(city: InsertCity): Promise<City>;
  getAllCities(): Promise<City[]>;
  getCity(id: number): Promise<City | undefined>;
  
  // Bus operations
  createBus(bus: InsertBus): Promise<Bus>;
  getAllBuses(): Promise<BusWithCities[]>;
  getBus(id: number): Promise<BusWithCities | undefined>;
  updateBus(id: number, bus: InsertBus): Promise<Bus | undefined>;
  deleteBus(id: number): Promise<boolean>;
  searchBuses(params: SearchBusParams): Promise<BusWithCities[]>;
  
  // Seat operations
  createSeatLayout(seatLayout: InsertSeatLayout): Promise<SeatLayout>;
  getBusSeatLayout(busId: number): Promise<SeatLayout[]>;
  getSeatAvailability(busId: number, date: string): Promise<SeatAvailability[]>;
  
  // Booking operations
  createBooking(booking: InsertBooking, seats: string[]): Promise<BookingWithDetails>;
  getBooking(id: number): Promise<BookingWithDetails | undefined>;
  getUserBookings(userId: number): Promise<BookingWithDetails[]>;
  getAllBookings(): Promise<BookingWithDetails[]>;
  cancelBooking(id: number): Promise<BookingWithDetails>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private cities: Map<number, City>;
  private buses: Map<number, Bus>;
  private seatLayouts: Map<number, SeatLayout>;
  private bookings: Map<number, Booking>;
  private bookingDetails: Map<number, BookingDetail>;
  private trips: Map<number, Trip>;
  private tripSeatAvailability: Map<string, TripSeatAvailability>;
  
  private userIdCounter: number;
  private cityIdCounter: number;
  private busIdCounter: number;
  private seatLayoutIdCounter: number;
  private bookingIdCounter: number;
  private bookingDetailIdCounter: number;
  private tripIdCounter: number;

  constructor() {
    this.users = new Map();
    this.cities = new Map();
    this.buses = new Map();
    this.seatLayouts = new Map();
    this.bookings = new Map();
    this.bookingDetails = new Map();
    this.trips = new Map();
    this.tripSeatAvailability = new Map();
    
    this.userIdCounter = 1;
    this.cityIdCounter = 1;
    this.busIdCounter = 1;
    this.seatLayoutIdCounter = 1;
    this.bookingIdCounter = 1;
    this.bookingDetailIdCounter = 1;
    this.tripIdCounter = 1;
    
    // Initialize with some data
    this.seedData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // City operations
  async createCity(insertCity: InsertCity): Promise<City> {
    const id = this.cityIdCounter++;
    const city: City = { ...insertCity, id };
    this.cities.set(id, city);
    return city;
  }

  async getAllCities(): Promise<City[]> {
    return Array.from(this.cities.values());
  }

  async getCity(id: number): Promise<City | undefined> {
    return this.cities.get(id);
  }

  // Bus operations
  async createBus(insertBus: InsertBus): Promise<Bus> {
    const id = this.busIdCounter++;
    const bus: Bus = { ...insertBus, id };
    this.buses.set(id, bus);
    
    // Create default seat layout for the bus
    this.createDefaultSeatLayout(id);
    
    return bus;
  }

  async getAllBuses(): Promise<BusWithCities[]> {
    return Array.from(this.buses.values()).map(bus => {
      const fromCity = this.cities.get(bus.fromCityId);
      const toCity = this.cities.get(bus.toCityId);
      if (!fromCity || !toCity) {
        throw new Error(`City not found for bus ${bus.id}`);
      }
      return { ...bus, fromCity, toCity };
    });
  }

  async getBus(id: number): Promise<BusWithCities | undefined> {
    const bus = this.buses.get(id);
    if (!bus) return undefined;
    
    const fromCity = this.cities.get(bus.fromCityId);
    const toCity = this.cities.get(bus.toCityId);
    if (!fromCity || !toCity) {
      throw new Error(`City not found for bus ${bus.id}`);
    }
    
    return { ...bus, fromCity, toCity };
  }

  async updateBus(id: number, insertBus: InsertBus): Promise<Bus | undefined> {
    if (!this.buses.has(id)) return undefined;
    
    const bus: Bus = { ...insertBus, id };
    this.buses.set(id, bus);
    return bus;
  }

  async deleteBus(id: number): Promise<boolean> {
    return this.buses.delete(id);
  }

  async searchBuses(params: SearchBusParams): Promise<BusWithCities[]> {
    let buses = Array.from(this.buses.values());
    
    // Filter by fromCityId
    if (params.fromCityId) {
      buses = buses.filter(bus => bus.fromCityId === params.fromCityId);
    }
    
    // Filter by toCityId
    if (params.toCityId) {
      buses = buses.filter(bus => bus.toCityId === params.toCityId);
    }
    
    // Filter by price range
    if (params.priceRange) {
      const [min, max] = params.priceRange.split('-').map(p => parseInt(p));
      if (!isNaN(min) && !isNaN(max)) {
        buses = buses.filter(bus => bus.price >= min * 100 && bus.price <= max * 100);
      } else if (!isNaN(min)) {
        buses = buses.filter(bus => bus.price >= min * 100);
      }
    }
    
    // Return buses with city information
    return buses.map(bus => {
      const fromCity = this.cities.get(bus.fromCityId);
      const toCity = this.cities.get(bus.toCityId);
      if (!fromCity || !toCity) {
        throw new Error(`City not found for bus ${bus.id}`);
      }
      return { ...bus, fromCity, toCity };
    });
  }

  // Seat operations
  async createSeatLayout(insertSeatLayout: InsertSeatLayout): Promise<SeatLayout> {
    const id = this.seatLayoutIdCounter++;
    const seatLayout: SeatLayout = { ...insertSeatLayout, id };
    this.seatLayouts.set(id, seatLayout);
    return seatLayout;
  }

  async getBusSeatLayout(busId: number): Promise<SeatLayout[]> {
    return Array.from(this.seatLayouts.values()).filter(
      (seatLayout) => seatLayout.busId === busId
    );
  }

  async getSeatAvailability(busId: number, date: string): Promise<SeatAvailability[]> {
    // Get bus seat layout
    const seatLayout = await this.getBusSeatLayout(busId);
    
    // Find or create a trip for this bus on this date
    let trip = Array.from(this.trips.values()).find(
      (trip) => trip.busId === busId && trip.date === date
    );
    
    if (!trip) {
      // Create a new trip
      const bus = await this.getBus(busId);
      if (!bus) {
        throw new Error(`Bus not found with id ${busId}`);
      }
      
      const tripId = this.tripIdCounter++;
      trip = {
        id: tripId,
        busId,
        date,
        availableSeats: bus.totalSeats
      };
      this.trips.set(tripId, trip);
      
      // Create seat availability for all seats
      for (const seat of seatLayout) {
        const key = `${trip.id}-${seat.seatNumber}`;
        this.tripSeatAvailability.set(key, {
          tripId: trip.id,
          seatNumber: seat.seatNumber,
          isAvailable: true
        });
      }
    }
    
    // Check which seats are booked for this trip
    const bookedSeats = new Set<string>();
    for (const booking of this.bookings.values()) {
      if (booking.busId === busId && booking.travelDate === date && booking.status === 'confirmed') {
        // Find all booking details for this booking
        const details = Array.from(this.bookingDetails.values()).filter(
          (detail) => detail.bookingId === booking.id
        );
        
        // Add all booked seats
        for (const detail of details) {
          bookedSeats.add(detail.seatNumber);
        }
      }
    }
    
    // Build seat availability response
    return seatLayout.map(seat => {
      const key = `${trip!.id}-${seat.seatNumber}`;
      const availability = this.tripSeatAvailability.get(key);
      
      return {
        seatNumber: seat.seatNumber,
        isAvailable: availability?.isAvailable !== false && !bookedSeats.has(seat.seatNumber),
        rowPosition: seat.rowPosition,
        columnPosition: seat.columnPosition,
        isVisible: seat.isVisible
      };
    });
  }

  // Booking operations
  async createBooking(insertBooking: InsertBooking, seats: string[]): Promise<BookingWithDetails> {
    // Create the booking
    const id = this.bookingIdCounter++;
    const booking: Booking = { 
      ...insertBooking, 
      id, 
      bookingDate: new Date()
    };
    this.bookings.set(id, booking);
    
    // Create booking details for each seat
    for (const seatNumber of seats) {
      const detailId = this.bookingDetailIdCounter++;
      const detail: BookingDetail = {
        id: detailId,
        bookingId: id,
        seatNumber
      };
      this.bookingDetails.set(detailId, detail);
    }
    
    // Update trip available seats
    const trip = Array.from(this.trips.values()).find(
      (trip) => trip.busId === booking.busId && trip.date === booking.travelDate
    );
    
    if (trip) {
      trip.availableSeats -= seats.length;
      this.trips.set(trip.id, trip);
      
      // Update seat availability
      for (const seatNumber of seats) {
        const key = `${trip.id}-${seatNumber}`;
        this.tripSeatAvailability.set(key, {
          tripId: trip.id,
          seatNumber,
          isAvailable: false
        });
      }
    }
    
    // Return the booking with details
    return this.getBookingWithDetails(booking);
  }

  async getBooking(id: number): Promise<BookingWithDetails | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    return this.getBookingWithDetails(booking);
  }

  async getUserBookings(userId: number): Promise<BookingWithDetails[]> {
    const userBookings = Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId
    );
    
    return Promise.all(userBookings.map(booking => this.getBookingWithDetails(booking)));
  }

  async getAllBookings(): Promise<BookingWithDetails[]> {
    const allBookings = Array.from(this.bookings.values());
    return Promise.all(allBookings.map(booking => this.getBookingWithDetails(booking)));
  }

  async cancelBooking(id: number): Promise<BookingWithDetails> {
    const booking = this.bookings.get(id);
    if (!booking) {
      throw new Error(`Booking not found with id ${id}`);
    }
    
    // Update booking status
    booking.status = 'cancelled';
    this.bookings.set(id, booking);
    
    // Make seats available again
    const details = Array.from(this.bookingDetails.values()).filter(
      (detail) => detail.bookingId === booking.id
    );
    
    const trip = Array.from(this.trips.values()).find(
      (trip) => trip.busId === booking.busId && trip.date === booking.travelDate
    );
    
    if (trip) {
      trip.availableSeats += details.length;
      this.trips.set(trip.id, trip);
      
      // Update seat availability
      for (const detail of details) {
        const key = `${trip.id}-${detail.seatNumber}`;
        this.tripSeatAvailability.set(key, {
          tripId: trip.id,
          seatNumber: detail.seatNumber,
          isAvailable: true
        });
      }
    }
    
    return this.getBookingWithDetails(booking);
  }

  // Helper methods
  private async getBookingWithDetails(booking: Booking): Promise<BookingWithDetails> {
    const bus = await this.getBus(booking.busId);
    if (!bus) {
      throw new Error(`Bus not found for booking ${booking.id}`);
    }
    
    const details = Array.from(this.bookingDetails.values()).filter(
      (detail) => detail.bookingId === booking.id
    );
    
    const seats = details.map(detail => detail.seatNumber);
    
    return {
      ...booking,
      bus,
      fromCity: bus.fromCity,
      toCity: bus.toCity,
      seats
    };
  }

  private createDefaultSeatLayout(busId: number): void {
    // Create a standard 5-row bus layout with 2-2 seats per row plus a back row with 5 seats
    const rows = 6;
    const seatsPerRow = 4; // except last row which has 5
    
    for (let row = 1; row <= rows; row++) {
      const cols = row === rows ? 5 : seatsPerRow;
      
      for (let col = 0; col < cols; col++) {
        let seatNumber: string;
        let isVisible = true;
        
        if (row === rows) {
          // Last row with 5 seats (A to E)
          seatNumber = `${row}${String.fromCharCode(65 + col)}`;
        } else {
          // Regular row with 2-2 configuration
          if (col === 2) {
            // Skip the aisle
            continue;
          } else if (col > 2) {
            // Adjust for aisle
            seatNumber = `${row}${String.fromCharCode(65 + col - 1)}`;
          } else {
            seatNumber = `${row}${String.fromCharCode(65 + col)}`;
          }
          
          // Mark certain seats as invisible to create empty spots
          if ((row === 1 && (col === 2 || col === 3)) || 
              (row === 3 && col === 0) ||
              (row === 4 && (col === 0 || col === 1))) {
            isVisible = false;
          }
        }
        
        this.createSeatLayout({
          busId,
          seatNumber,
          rowPosition: row,
          columnPosition: col,
          isVisible
        });
      }
    }
  }

  private async seedData(): Promise<void> {
    // Create cities
    const bangalore = await this.createCity({ name: 'Bangalore, Karnataka' });
    const hyderabad = await this.createCity({ name: 'Hyderabad, Telangana' });
    const chennai = await this.createCity({ name: 'Chennai, Tamil Nadu' });
    const mumbai = await this.createCity({ name: 'Mumbai, Maharashtra' });
    const vijayawada = await this.createCity({ name: 'Vijayawada, Andhra Pradesh' });
    
    // Create buses
    await this.createBus({
      name: 'Karnataka Express',
      type: 'Luxury',
      fromCityId: bangalore.id,
      toCityId: hyderabad.id,
      departureTime: '07:30',
      arrivalTime: '14:15',
      duration: '6h 45m',
      price: 4500, // ₹45.00
      totalSeats: 30,
      amenities: ['wifi', 'ac', 'refreshments'],
      rating: 450, // 4.5 stars
      reviewCount: 120
    });
    
    await this.createBus({
      name: 'Telangana Travels',
      type: 'Standard',
      fromCityId: bangalore.id,
      toCityId: hyderabad.id,
      departureTime: '09:00',
      arrivalTime: '16:30',
      duration: '7h 30m',
      price: 2850, // ₹28.50
      totalSeats: 40,
      amenities: ['ac'],
      rating: 310, // 3.1 stars
      reviewCount: 85
    });
    
    await this.createBus({
      name: 'Tamil Nadu Superfast',
      type: 'Luxury',
      fromCityId: chennai.id,
      toCityId: bangalore.id,
      departureTime: '08:00',
      arrivalTime: '14:30',
      duration: '6h 30m',
      price: 5200, // ₹52.00
      totalSeats: 25,
      amenities: ['wifi', 'ac', 'refreshments', 'entertainment'],
      rating: 470, // 4.7 stars
      reviewCount: 95
    });
    
    await this.createBus({
      name: 'Maharashtra Travels',
      type: 'Standard',
      fromCityId: mumbai.id,
      toCityId: hyderabad.id,
      departureTime: '18:00',
      arrivalTime: '08:30',
      duration: '14h 30m',
      price: 8500, // ₹85.00
      totalSeats: 35,
      amenities: ['wifi', 'ac', 'refreshments'],
      rating: 390, // 3.9 stars
      reviewCount: 42
    });
    
    await this.createBus({
      name: 'Andhra Pradesh Express',
      type: 'Luxury',
      fromCityId: vijayawada.id,
      toCityId: bangalore.id,
      departureTime: '19:30',
      arrivalTime: '05:45',
      duration: '10h 15m',
      price: 9900, // ₹99.00
      totalSeats: 22,
      amenities: ['wifi', 'ac', 'refreshments', 'entertainment', 'sleeper'],
      rating: 480, // 4.8 stars
      reviewCount: 65
    });
  }
}

export const storage = new MemStorage();
