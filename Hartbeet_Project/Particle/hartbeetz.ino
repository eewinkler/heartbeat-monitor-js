
// This #include statement was automatically added by the Particle IDE.
#include "BPMMonitorSM.h"

//-------------------------------------------------------------------

#include <Wire.h>
#include "MAX30105.h"
#include "BPMMonitorSM.h"
#include "spo2_algorithm.h"

//-------------------------------------------------------------------

using namespace std;

//-------------------------------------------------------------------

#define ONE_DAY_MILLIS (24 * 60 * 60 * 1000)
unsigned long lastSync = millis();

//-------------------------------------------------------------------

// Sensors and Outputs

//Variables and objects
MAX30105 heartSensor = MAX30105();

//-------------------------------------------------------------------

// State Machines

BPMMonitorSM bpmSM (heartSensor);

//-------------------------------------------------------------------

// State machine scheduler

bool executeStateMachines = false;

void simpleScheduler() {
   executeStateMachines = true;
}

Timer schedulerTimer(10, simpleScheduler);

//-------------------------------------------------------------------

byte pulseLED = 11; //Must be on PWM pin
byte readLED = 13; //Blinks with each data read

int funcName(String extra);

void setup() {
   Serial.begin(115200); 
   Serial.println("ECE 413/513 Argon and MAX30105 Test");

   Particle.function("callThisUpdate", updateSettings);

   pinMode(pulseLED, OUTPUT);
   pinMode(readLED, OUTPUT);
   

   // Sensor Initialization:  default I2C port, 400kHz speed
   if (!heartSensor.begin(Wire, I2C_SPEED_FAST)) {
      Serial.println("MAX30105 was not found. Please check wiring/power.");
      while (1);
   }

   // Configure sensor with github settings
   byte ledBrightness = 60; //Options: 0=Off to 255=50mA
   byte sampleAverage = 4; //Options: 1, 2, 4, 8, 16, 32
   byte ledMode = 2; //Options: 1 = Red only, 2 = Red + IR, 3 = Red + IR + Green
   byte sampleRate = 100; //Options: 50, 100, 200, 400, 800, 1000, 1600, 3200
   int pulseWidth = 411; //Options: 69, 118, 215, 411
   int adcRange = 4096; //Options: 2048, 4096, 8192, 16384
   heartSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange); 
  
   // Turn Red LED to low to indicate sensor is running
   heartSensor.setPulseAmplitudeRed(0x0A);
  
   // Turn off Green LED
   heartSensor.setPulseAmplitudeGreen(0); 
  
   // Starts the state machine scheduler timer.
   schedulerTimer.start();
   
   // Setup webhook subscribe
    Particle.subscribe("hook-response/pubReadings", myHandler1, MY_DEVICES);
    Particle.subscribe("hook-response/currentConfig", myHandler, MY_DEVICES);
}

//-------------------------------------------------------------------

void loop() {
   // Request time synchronization from the Particle Cloud once per day
   if (millis() - lastSync > ONE_DAY_MILLIS) {
      Particle.syncTime();
      
      lastSync = millis();
   }

   if (executeStateMachines) {
      bpmSM.execute();
   }
}

//-------------------------------------------------------------------

// When obtain response from the publish
void myHandler(const char *event, const char *data) {
  // Formatting output
   //ex data = "{\"startTime\":1234,\"endTime\":1,\"frequency\":45}";
   String output = "";
   
   output = String::format("Response from Post:\n  %s\n", data); //isnt returning anything at the moment
   Serial.println(output);

   //data format: 3 numbers separated by spaces
   String startInterval = "";
   String endInterval = "";
   String freq = "";

   String thisboy = data;
   

   int i=0,j=0,k=0;

   while(i < output.length()){
      if(thisboy.charAt(i) >='0' && thisboy.charAt(i)<='9'){ //is between 0-9
         startInterval.concat(thisboy.charAt(i));
         if(thisboy.charAt(i+1) >='0' && thisboy.charAt(i+1)<='9'){
         startInterval.concat(thisboy.charAt(i+1));
         i=i+1;
         if(thisboy.charAt(i+2) >='0' && thisboy.charAt(i+2)<='9'){
            startInterval.concat(thisboy.charAt(i+2));
            i=i+2;
            if(thisboy.charAt(i+3) >='0' && thisboy.charAt(i+3)<='9'){
               startInterval.concat(thisboy.charAt(i+3));
               i=i+3;
            }else break;
         }else break;
         }else break;
      break;
      }
      ++i;
   }
   
   j=i+1; 
   while(j < output.length()){
      if(thisboy.charAt(j) >='0' && thisboy.charAt(j)<='9'){ //is between 0-9
         endInterval.concat(thisboy.charAt(j));
         if(thisboy.charAt(j+1) >='0' && thisboy.charAt(j+1)<='9'){
         endInterval.concat(thisboy.charAt(j+1));
         j=j+1;
         if(thisboy.charAt(j+2) >='0' && thisboy.charAt(j+2)<='9'){
            endInterval.concat(thisboy.charAt(j+2));
            j=j+2;
            if(thisboy.charAt(j+3) >='0' && thisboy.charAt(j+3)<='9'){
               endInterval.concat(thisboy.charAt(j+3));
               j=j+3;
            }else break;
         }else break;
         }else break;
      break;
      }
      j++; 
   }

   k=j+1; 
   while(k < output.length()){
      if(thisboy.charAt(k) >='0' && thisboy.charAt(k)<='9'){ //is between 0-9
         freq.concat(thisboy.charAt(k));
         if(thisboy.charAt(k+1) >='0' && thisboy.charAt(k+1)<='9'){
         freq.concat(thisboy.charAt(k+1));
         k=k+1;
         if(thisboy.charAt(k+2) >='0' && thisboy.charAt(k+2)<='9'){
            freq.concat(thisboy.charAt(k+2));
            k=k+2;
            if(thisboy.charAt(k+3) >='0' && thisboy.charAt(k+3)<='9'){
               freq.concat(thisboy.charAt(k+3));
               k=k+3;
            }else break;
         }else break;
         }else break;
      break;
      }
      k++;
   }

   //converts three string variables into ints and updates the device parameters 
   bpmSM.setstartInterval(startInterval.toInt()*60);
   bpmSM.setendInterval(endInterval.toInt()*60); 
   bpmSM.setfrequencyTime(freq.toInt()); 

   String coolcool = "Updated settings.";
   Serial.println(coolcool);
   Serial.println(bpmSM.getstartInterval());
   Serial.println(bpmSM.getendInterval());
   Serial.println(bpmSM.getfrequencyTime());
   bpmSM.resetState();
}

void myHandler1(const char *event, const char *data) {
   String output = "";
   output = String::format("Response from Post:\n  %s\n", data); //isnt returning anything at the moment.
   Serial.println(output);
}



// Cloud functions must return int and take one String
int updateSettings(String extra) {
   String data = "";
   data = String::format("{ \"lol\": \"hi\"}"); 
   Particle.publish("currentConfig", data, PRIVATE);
   

   String coolcool = "SERVER HAS SENT UPDATED SETTINGS.";
   Serial.println(coolcool);
   coolcool = "Previous settings.";
   Serial.println(coolcool);
   Serial.println(bpmSM.getstartInterval());
   Serial.println(bpmSM.getendInterval());
   Serial.println(bpmSM.getfrequencyTime());
   return 69;
}