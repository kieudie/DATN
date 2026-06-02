import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Response } from "express";
import { google } from "googleapis";
import { LoggerService } from "../../common/logger/logger.service";
import { config } from "../../config/config";
import { CreateCalendarEventDto } from "./dto/create-calendar-event.dto";

@Injectable()
export class RecruitmentCalendarService {
  private readonly logger = new LoggerService("RecruitmentCalendarService");
  private calendar;

  constructor() {
    const clientId = config.get("google-sheet.recruitment-calendar.client-id");
    const clientSecret = config.get(
      "google-sheet.recruitment-calendar.client-secret",
    );
    const refreshToken = config.get(
      "google-sheet.recruitment-calendar.refresh-token",
    );

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);

    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    this.calendar = google.calendar({ version: "v3", auth: oAuth2Client });
  }

  async createEvent(dto: CreateCalendarEventDto, res: Response) {
    try {
      const event = await this.calendar.events.insert({
        calendarId: "primary",
        sendUpdates: "all",
        requestBody: {
          summary: dto.summary,
          description: dto.description ?? "",
          location: dto.location ?? "",
          start: {
            dateTime: dto.startDateTime,
            timeZone: "Asia/Ho_Chi_Minh",
          },
          end: {
            dateTime: dto.endDateTime,
            timeZone: "Asia/Ho_Chi_Minh",
          },
          attendees: dto.attendees.map((email) => ({ email })),
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 10 },
              { method: "popup", minutes: 10 },
            ],
          },
        },
      });

      this.logger.log(
        `Created calendar event: ${event.data.id} - ${event.data.summary}`,
      );

      return res.status(200).json({
        message: "Event created successfully",
        data: {
          eventId: event.data.id,
          htmlLink: event.data.htmlLink,
          summary: event.data.summary,
          start: event.data.start,
          end: event.data.end,
          attendees: event.data.attendees,
          status: event.data.status,
        },
      });
    } catch (error) {
      this.logger.error("Failed to create calendar event", error);
      throw new InternalServerErrorException(
        `Failed to create calendar event: ${error.message}`,
      );
    }
  }
}
