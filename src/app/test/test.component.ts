import { Component } from '@angular/core';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css']
})
export class TestComponent {

  isLoading = false;
  downloadSpeed: number | null = null;
  timedTestDuration = 20; // Duration of the test in seconds
  receivedBytes = 0;
  countdown: number | null = null;
  private stopTest$ = new Subject<void>();
  receivedData: number = 0;

  constructor(private httpClient: HttpClient) { }
  
  testDownloadSpeed() {
    this.isLoading = true;
    this.downloadSpeed = null;
    const startTime = new Date().getTime();

    this.httpClient.get('https://localhost:7041/api/MeasureSpeed/download', {
      responseType: 'blob',
      observe: 'response'
    }).subscribe(response => {
      const endTime = new Date().getTime();
      const duration = (endTime - startTime) / 1000; // Duration in seconds
      const fileSize = response.body?.size || 0; // Size in bytes, handling null

      // Speed in Mbps, rounded to two decimal places
      this.downloadSpeed = Math.round(((fileSize * 8) / (duration * 1024 * 1024)) * 100) / 100;

      this.isLoading = false;
    }, error => {
      console.error('Error during download speed test', error);
      this.isLoading = false;
    });
  }

//Test speed in 20 seconds
testTimedDownloadSpeed() {
  this.isLoading = true;
  this.downloadSpeed = null;
  this.receivedBytes = 0;
  this.countdown = this.timedTestDuration;
  const startTime = new Date().getTime();
  

  this.httpClient.get('https://localhost:7041/api/MeasureSpeed/timedDownload', {
    responseType: 'blob', // Expecting a blob response
    observe: 'events', // Observe HTTP events
    reportProgress: true // Report download progress
  }).pipe(
    takeUntil(this.stopTest$)
  ).subscribe(event => {
    if (event.type === HttpEventType.DownloadProgress) {
      this.receivedData = event.loaded; // Update received data
    } else if (event instanceof HttpResponse) {
      console.log('Download complete');
      this.receivedBytes = this.receivedData; // Ensure receivedBytes is updated
      this.calculateDownloadSpeed(startTime);
    }
  }, error => {
    console.error('Error during timed download test', error);
    this.isLoading = false;
  });

  // Update the countdown every second
  const countdownInterval = setInterval(() => {
    if (this.countdown !== null) {
      this.countdown--;
    }
  }, 1000);

  // Stop the test after the specified duration
  setTimeout(() => {
    this.stopTest$.next(); // Send stop signal
    clearInterval(countdownInterval);
    this.calculateDownloadSpeed(startTime);
    this.isLoading = false;
  }, this.timedTestDuration * 1000);
}

private calculateDownloadSpeed(startTime: number) {
  const endTime = new Date().getTime();
  const duration = (endTime - startTime) / 1000; // Duration in seconds
  if (this.downloadSpeed === null) { // Check if the test was not already completed
    this.downloadSpeed = Math.round(((this.receivedData * 8) / (duration * 1024 * 1024)) * 100) / 100;
  }
  console.log('Download speed', this.downloadSpeed);
}


  // Function to format speed for display
  formatSpeed(speedMbps: number): string {
    if (speedMbps > 1000) {
      return (speedMbps / 1000).toFixed(2) + ' Gbps';
    } else {
      return speedMbps.toFixed(2) + ' Mbps';
    }
  }
}
