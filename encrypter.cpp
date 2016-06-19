#include <iostream>
#include <ctime>
#include <string>
#include <fstream>
#include <cstdlib>
#include <math.h>
#include <sstream>
#include <unistd.h>
using namespace std;
string encryptDecrypt(string toEncrypt) {
    char key[31] = {'K', 'C', 'Q', 'R', 'S', 'H', 'A', 'D', 'N', 'F', 'K', 'I', 'O', 'L', 'M', 'F', 'V', 'C', 'S', 'B', 'V', 'X', 'N', 'C', 'J', 'S', 'T', 'U', 'R', 'Y', 'Q'};
    string output = toEncrypt;
    for (int i = 0; i < toEncrypt.size(); i++)
    {
        output[i] = toEncrypt[i] ^ key[i % (sizeof(key) / sizeof(char))];
       

    }
    
    return output;
}

int main(int argc, const char * argv[]){
	string readBuffer;
	string input[200] = "null";
	string lock;
	jump:
	usleep(500);
 ifstream myfile ("io.dat");
 int i = 0;
  if (myfile.is_open())
  {
    while ( getline (myfile,readBuffer) )
    {
      input[i] = readBuffer;
      cout << input[i]<<"\n";
      i++;
    }
    myfile.close();
  }
  if(input[0] == lock)
  {
  	goto jump;
  }
  lock = input[0];
  int y = 0;
  ofstream outFile("out.dat");
  while(input[y] != "null")
  {
  outFile << encryptDecrypt(input[y])<<"\n";
  y++;
	}
  outFile.close();

  goto jump;
}