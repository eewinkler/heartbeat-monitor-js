//-------------------------------------------------------------------

#include "BPMMonitorSM.h"
#include "MAX30105.h"
#include "heartRate.h"
#include <Wire.h>
#include <vector>
#include "spo2_algorithm.h"
//#include "readings.h"
//#include "project2checkpoint.ino"

//-------------------------------------------------------------------

using namespace std;

// #if defined(__AVR_ATmega328P__) || defined(__AVR_ATmega168__)
// //Arduino Uno doesn't have enough SRAM to store 100 samples of IR led data and red led data in 32-bit format
// //To solve this problem, 16-bit MSB of the sampled data will be truncated. Samples become 16-bit data.
// uint16_t irBuffer[100]; //infrared LED sensor data
// uint16_t redBuffer[100];  //red LED sensor data
// #else
uint32_t irBuffer[100]; //infrared LED sensor data
uint32_t redBuffer[100];  //red LED sensor data
//#endif

int32_t bufferLength; //data length
int32_t spo2; //SPO2 value
int8_t validSPO2; //indicator to show if the SPO2 calculation is valid
int32_t heartRate; //heart rate value
int8_t validHeartRate; //indicator to show if the heart rate calculation is valid

LEDStatus statusLED(RGB_COLOR_BLUE, LED_PATTERN_BLINK, LED_SPEED_NORMAL, LED_PRIORITY_IMPORTANT);

BPMMonitorSM::BPMMonitorSM(MAX30105 &mySensor) : heartSensor(mySensor){
   state = BPMMonitorSM::S_Check;
}

//-------------------------------------------------------------------

void BPMMonitorSM::execute() {
   String data = "";
   String loldata = "";

   long irValue = 0;

   int curTime = (int) Time.now();
   
   int8_t curHour = 0;
   int8_t curMin = 0;
   int16_t normalizedTime = 0;

   switch (state) {
      case BPMMonitorSM::S_Init:
         //Clear old readings
         avgBPM = 0.0;
         avgo2 = 0.0;
         counter = 0;
         tick = 0;

         
         if(!publishThese.empty() && Particle.connected()){ //Go publish readings stored in local storage if there are any first
            checktheReadings(); //check if the data is older than 24 hours and delete them before getting ready to send it
            state = BPMMonitorSM::S_EmptyQ;
            break;
         }   
         //Determine what time it currently is
         curHour = Time.hour();
         curMin = Time.minute();
         normalizedTime = curHour*60 + curMin;

     

         //Read only between the set time
         if(startInterval<endInterval){
            if(normalizedTime>=startInterval && normalizedTime<=endInterval){
               statusLED.setColor(RGB_COLOR_BLUE);
               statusLED.setActive(true); 
               ledTimeout = Time.now() + 5*60; //Turn off LED after 1 to 5min time if no finger is read
               state = BPMMonitorSM::S_ReadSensor; 
               break;
            }
            else{
               nextReading = Time.now() + frequencyTime*60; 
               state = BPMMonitorSM::S_Wait; 
               break;
            }
         }
         else{
            if(normalizedTime<=startInterval && normalizedTime>=endInterval){
               statusLED.setColor(RGB_COLOR_BLUE);
               statusLED.setActive(true); 
               ledTimeout = Time.now() + 5*60; //Turn off LED after 1 to 5min time if no finger is read
               state = BPMMonitorSM::S_ReadSensor; 
               break;
            }
            else{
               nextReading = Time.now() + frequencyTime*60; 
               state = BPMMonitorSM::S_Wait; 
               break;
            }
         }

         break;


      case BPMMonitorSM::S_Check:
         //Retrieve the most updated information         
         loldata = String::format("{ \"lol\": \"hi\"}"); 
         Particle.publish("currentConfig", data, PRIVATE);

         Serial.println(getstartInterval());
         Serial.println(getendInterval());
         Serial.println(getfrequencyTime());
                  
         state = BPMMonitorSM::S_Init;
         break;

      case BPMMonitorSM::S_EmptyQ:
         
         for(int i=0; i<publishThese.size(); ++i ){
            data = String::format("{ \"avgBPM\": \"%f\", \"avgO2\": \"%f\", \"time\": \"%d\" }", publishThese.at(i).bpm, publishThese.at(i).o2, publishThese.at(i).timeCur);           
            Serial.println(data);
      
            //Publish to webhook
            Particle.publish("pubReadings", data, PRIVATE);
         }
         publishThese.clear();
                 
         state = BPMMonitorSM::S_Check; 
         break;

      case BPMMonitorSM::S_ReadSensor:
         //Took too long and didnt detect finger for 5 min
         if(ledTimeout <= Time.now()){
            statusLED.setActive(false); //turn of LED 
            Serial.println("No finger detected, going to wait until next reading");
            nextReading = Time.now() + frequencyTime*60; //set to one for demo
            state =  BPMMonitorSM::S_Wait; //GO back to wait stage
            break;
         }

         //Check if theres a finger
         irValue = heartSensor.getIR();
         if (irValue < 5000) {
            tick++;
            if (tick == 20) {
               tick = 0;
               Serial.println("No finger detected.");
            }
         }
         //If there is a finger
         else if (checkForBeat(irValue) == true)  {

            bufferLength = 100; //buffer length of 100 stores 4 seconds of samples running at 25sps      

            //read the first 100 samples, and determine the signal range
            for (byte i = 0 ; i < bufferLength ; i++){
               while (heartSensor.available() == false) //do we have new data?
                  heartSensor.check(); //Check the sensor for new data

               redBuffer[i] = heartSensor.getRed();
               irBuffer[i] = heartSensor.getIR();
               heartSensor.nextSample(); //We're finished with this sample so move to next sample
            }

            //calculate heart rate and SpO2 after first 100 samples (first 4 seconds of samples)
            maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferLength, redBuffer, &spo2, &validSPO2, &heartRate, &validHeartRate);

            while(counter<10){
               //dumping the first 25 sets of samples in the memory and shift the last 75 sets of samples to the top
               for (byte i = 25; i < 100; i++){
                  redBuffer[i - 25] = redBuffer[i];
                  irBuffer[i - 25] = irBuffer[i];
               }

               //take 25 sets of samples before calculating the heart rate.
               for (byte i = 75; i < 100; i++){
                  while(heartSensor.available() == false) //do we have new data?
                     heartSensor.check(); //Check the sensor for new data

                     redBuffer[i] = heartSensor.getRed();
                     irBuffer[i] = heartSensor.getIR();
                     heartSensor.nextSample(); //We're finished with this sample so move to next sample
               }

               //After gathering 25 new samples recalculate HR and SP02
               maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferLength, redBuffer, &spo2, &validSPO2, &heartRate, &validHeartRate);
            
               if(validHeartRate && validSPO2 && (counter < 10)){ //sums up 10 values 
                  avgBPM += heartRate;
                  avgo2 += spo2;
                  counter++;
                        Serial.print("Heart beat detected: ");
                        Serial.print(heartRate);
                        Serial.println(" avgBPM");

                        Serial.print("Oxygen Level detected: ");
                        Serial.print(spo2);
                        Serial.println(" %");

      
                        Serial.println();

                 // state = BPMMonitorSM::S_ReadSensor;
                  //break;   
               }   
            }
         }

         //Determines the next state
         if (counter == 10) {
            state = BPMMonitorSM::S_Report;
         }
         else{
            state = BPMMonitorSM::S_ReadSensor;
         }         
         break;
        
      case BPMMonitorSM::S_Report:
         //Turn off blue LED once reading is done
         statusLED.setActive(false); 
         delay(1000);

         avgBPM = avgBPM / 10.0; //average the 3 samples
         avgo2 = avgo2 / 10.0;
         curTime = (int) Time.now(); //timestamp for the reading in UNIX time

         Serial.print("Heart beat detected: ");
         Serial.print(avgBPM);
         Serial.println(" avgBPM");

         Serial.print("Oxygen Level detected: ");
         Serial.print(avgo2);
         Serial.println(" %");

         Serial.print("Current Time is: "); 
         Serial.print(curTime);
         Serial.println(" .");


         if(Particle.connected()){ //if its connected to wifi
            data = String::format("{ \"avgBPM\": \"%f\", \"avgO2\": \"%f\", \"time\": \"%d\" }", avgBPM, avgo2, curTime);           
            Serial.println(data);

            // Publish to webhook
            Particle.publish("pubReadings", data, PRIVATE);
            //flash green led for 2 sec
            statusLED.setColor(RGB_COLOR_GREEN);
            statusLED.setActive(true); //turn green if reading is sent to server
            delay(3000); //turn on for 3 sec
            statusLED.setActive(false); //turn green off 
         }
         else{ //Store it locally if its offline
            //flash yellow led for 2 sec
            statusLED.setColor(RGB_COLOR_YELLOW);
            statusLED.setActive(true); //turn yellow on if stored offline
            delay(3000); //turn on for 3 sec
            statusLED.setActive(false); //turn yellow off 
                   
            publishThese.push_back({avgBPM,avgo2,curTime});
         }
         
        

         //determine next reading time and go into wait state
         nextReading = Time.now() + frequencyTime*60; //set to one for demo
         state = BPMMonitorSM::S_Wait;
      
         break;

   
      case BPMMonitorSM::S_Wait:
         //check every 15sec if its read for the next reading
         Serial.println("Waiting...");
         delay(15000); 
         
         //Check to see if its time for the next reading
         if(nextReading <= Time.now()){ 
            
            state = BPMMonitorSM::S_Check;
         }
         else{
            state = BPMMonitorSM::S_Wait;
         }

         break;
         
   }
}

//-------------------------------------------------------------------
void BPMMonitorSM::checktheReadings(){
   int curTime = (int) Time.now();
   vector<int> deletethesIndexes;
   // publishThese.push_back({120.0, 99.0, Time.now() - 60*60*24 - 1});
   //Serial.println(publishThese.size());

   for (int i=0; i<publishThese.size(); i++){
      if( (publishThese.at(i).timeCur + 60*60*24) < curTime ){ //the current time is greater than the readings time + 24 hours
         deletethesIndexes.push_back(i);
      }
   } 
   for (int i=0; i<deletethesIndexes.size(); i++){ //delete the readings at the indexes found
      publishThese.erase(publishThese.begin()+deletethesIndexes.at(i));
   } 


}




//-------------------------------------------------------------------

