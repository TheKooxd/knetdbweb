	if(inputBuffer == "search")
	{
	bool crossrefrence = false;
							string result[2000] = "[EMPTY]";
							int resultInt = 0;
							cout << "\033[1;35m[!INFO!]\033[0m Give search term: ";
							cin >> inputBuffer;
							string databaseDir = "database/" + normalCrypt("index");
							ifstream dbIndexRead (databaseDir.c_str());
							int index = 0;							
							while (getline(dbIndexRead, readBuffer))
							{
								if(readBuffer == "")
								{
									break;
								}
								dataArray[index] = normalCrypt(readBuffer);
								index++;
							}
							while(index != -1)
							{
							payload(normalCrypt(dataArray[index]), "database/", "tags", 1);
							for(int i = 0; i < 30; i++)
							{
					   		tag[i] = outputPayload[i];
					   	}
							   		for(int i = 0; i < 30;i++)
							   		{
							   			if(tag[i] == inputBuffer)
							   			{
							   				payload(normalCrypt(dataArray[index]), "database/", "id", 1);
							   				result[resultInt] = outputPayload[0];
							   				resultInt++;
							   			}
							   		}
							   		
							   		index--;
							}
							dbListPrint:
							
							int loop = 0;
							string printId[200] = "[EMPTY]";
							string printTitle[200] = "[EMPTY]";
							string printDate[200] = "[EMPTY]";
							string printCreator[200] = "[EMPTY]";
							string searchTerm = "[EMPTY]";
							int printOut = 0;
							int row = 2;
							while(result[loop] != "[EMPTY]")
								{
							payload(normalCrypt(result[loop]), "database/", "id", 1);
							printId[loop] = outputPayload[0];
							payload(normalCrypt(result[loop]), "database/", "title", 1);
							printTitle[loop] = outputPayload[0];
							payload(normalCrypt(result[loop]), "database/", "date", 1);
							printDate[loop] = outputPayload[0];
							payload(normalCrypt(result[loop]), "database/", "creator", 1);
							printCreator[loop] = outputPayload[0];
							loop++;
								}
								loop--;
								list:
								row = 2;
								system("clear");
								if(!crossrefrence)
								{
								int x = line();
								SetCursorPos(((x+(inputBuffer.length()))/2)-16, 0);
								cout << "[SEARCH RESULT FOR TERM "<<inputBuffer<<"]\n";
								line();
								SetCursorPos(1,1);
								cout << "ID";
								SetCursorPos(x/6,1);
								cout << "TITLE";
								SetCursorPos(x/1.6,1);
								cout << "CREATOR";
								SetCursorPos(x/1.2,1);
								cout << "DATE\n";
							while(loop > -1)
							{
								SetCursorPos(1,row);
								cout << printId[loop];
								SetCursorPos(x/6,row);
								cout << printTitle[loop];
								SetCursorPos(x/1.6,row);
								cout << printCreator[loop];
								SetCursorPos(x/1.2,row);
								cout << printDate[loop]<<"\n";
								row = row + 1;
								
							loop--;
							}
							line();
							}
								if(crossrefrence)
								{
								int x = line();
								SetCursorPos(x/2-11, 0);
								cout << "[CROSSREFRENCE RESULTS]\n";
								line();
								SetCursorPos(1,1);
								cout << "ID";
								SetCursorPos(x/6,1);
								cout << "TITLE";
								SetCursorPos(x/1.8,1);
								cout << "CREATOR";
								SetCursorPos(x/1.4,1);
								cout << "DATE\n";
								SetCursorPos(x/1.1,1);
								cout << "MACTHES\n";
							while(loop > -1)
							{
								SetCursorPos(1,row);
								cout << printId[loop];
								SetCursorPos(x/6,row);
								cout << printTitle[loop];
								SetCursorPos(x/1.8,row);
								cout << printCreator[loop];
								SetCursorPos(x/1.4,row);
								cout << printDate[loop];
								SetCursorPos(x/1.1,row);
								cout << cr[stoi(printId[loop])].rank<<"\n";
								row = row + 1;
								
							loop--;
							}
							line();
							crossrefrence = false;
								}

							cout << "\n\033[1;35m[!INFO!]\033[0m Exit, refine or type in [id] for more information: ";
							cin >> inputBuffer;
							if(inputBuffer == "exit") 
							{
								system("clear");
								goto database;
							}

							if(inputBuffer == "refine")
							{
								for(int i = 0;i < 2000;i++)
									{
										result[i] = "[EMPTY]";
									}
								bool match;
								cout << "\033[1;35m[!INFO!]\033[0m Give refine term: ";
								cin >> inputBuffer;
								index = 0;
								resultInt = 0;
								while(printId[index] != "[EMPTY]")
									{
										
									payload(normalCrypt(printId[index]), "database/", "tags", 1);
									for(int i = 0; i < 13; i++)
									{

										tag[i] = outputPayload[i];
							  			}
							  			
							  			
									   		for(int i = 0; i < 11;i++)
									   		{
									   			if(tag[i] == inputBuffer)
									   			{

									   				match = true;
									   				payload(normalCrypt(printId[index]), "database/", "id", 1);
									   				result[resultInt] = outputPayload[0];
									   				resultInt++;
									   			}
									   		}
								index++;
								
							}
							goto dbListPrint;
							}
							else
							{
								loop = 0;
								while(printId[loop] != "[EMPTY]")
								{

									if(printId[loop] == inputBuffer)
									{
										searchTerm = printId[loop];
										break;
									}
									loop++;
								}
								if(searchTerm != "[EMPTY]")
								{
									cout << "\n\033[1;35m[!INFO!]\033[0m Loading data for file "<<searchTerm<<"\n";
										
										database dataCache; 
										dataCache.content[200] = "[EMPTY]";
									payload(normalCrypt(searchTerm), "database/", "title", 1);
									dataCache.title = outputPayload[0];
									payload(normalCrypt(searchTerm), "database/", "creator", 1);
									dataCache.creator = outputPayload[0];
									payload(normalCrypt(searchTerm), "database/", "date", 1);
									dataCache.date = outputPayload[0];
									payload(normalCrypt(searchTerm), "database/", "content", 150);
									for(int i=0; i < 150;i++)
									{

									dataCache.tags[i] = outputPayload[i];
									dataCache.content[i] = outputPayload[i];
									}

									payload(normalCrypt(searchTerm), "database/", "tags", 150);
									
									for(int i=0; i < 199;i++)
									{
									dataCache.tags[i] = outputPayload[i];
									}

									payload(normalCrypt(searchTerm), "database/", "permission", 1);

									dataCache.permission = outputPayload[0];
									if(dataCache.permission == "admin")
									{
										if(!isAdmin(userType, userID))
										{

											cout << "\033[1;31m[!ALERT!]\033[0m This file requires an administrative permissions!\n";
											pause();
											goto skipDatabase;
										}

										}
										dataCache.id = inputBuffer;
										system("clear");
										int length = dataCache.title.length();
										cout << "======================================================================================\n";
										SetCursorPos(40-(length/2), 0);
										cout << "[\033[1;32m"<<dataCache.title<<"\033[0m]\n";
										SetCursorPos(0,2);
										cout << "Creator: \033[1;33m"<<dataCache.creator<<"\033[0m\n";
										SetCursorPos(25,2);
										if(dataCache.permission == "admin")
										{
											cout << "Permission level: \033[1;33m"<<dataCache.permission<<"\033[0m\n";
										}
										else cout << "Permission level: "<<dataCache.permission<<"\n";
										SetCursorPos(57,2);
										cout << "Creation date: \033[1;33m"<<dataCache.date<<"\033[0m\n";
										SetCursorPos(0,3);
										int index = 0;
										cout << "\n\n\033[1;32m=============================[CONTENT]===========================\033[0m\n";
										while(dataCache.content[index] != "end")
										{
										cout << dataCache.content[index]<<"\n";
										index++;
										}
										index = 0;
										cout << "\n\n==============TAGS===============\n";
										while(dataCache.tags[index] != "end")
										{
										cout << dataCache.tags[index]<<"\n";
										index++;
										}
										cout << "=================================\n";
										cout << "\n\033[1;35m[!INFO!]\033[0m Write exit to leave or crossrefrence.\n";
										cin >> inputBuffer;
										if(inputBuffer == "crossrefrence")
										{
											for(int i = 0; i<2000;i++)
											{
												cr[i].rank = 0;
												cr[i].id = "0";
												cr[i].read = false;
												cr[i].wrote = false;
											}
											cout << "Crossrefrencing against all database files.\n";
											
											resultInt = 0;
											index = 0;
											string databaseDir = "database/" + normalCrypt("index");
							ifstream dbIndexRead (databaseDir.c_str());
							while (getline(dbIndexRead, readBuffer))
							{;
								if(readBuffer == "")
								{
									break;
								}
								dataArray[index] = normalCrypt(readBuffer);
								index++;
							}
							
							index--;
							int loopVar = index;
							
							while(index != -1)
							{
								
							payload(normalCrypt(dataArray[index]), "database/", "tags", 1);
							for(int i = 0; i < 25; i++)
							{
					   		tag[i] = outputPayload[i];
					   	}
					   		for(int y = 0; y < 25;y++)
					   		{
							   		for(int i = 0; i < 25;i++)
							   		{
							   			if(tag[i] == "[EMPTY]"||tag[i] == "end"||dataCache.tags[y] == "[EMPTY]"||dataCache.tags[y] == "end")
							   			{
							   			goto emptySkip;	
							   		}
							   			if(tag[i] == dataCache.tags[y])
							   			{
							   				payload(normalCrypt(dataArray[index]), "database/", "id", 1);
							   				string idNum = outputPayload[0];
							   				if(cr[stoi(idNum)].read)
							   				{
							   					
							   					cr[stoi(idNum)].rank++;
							   					cr[stoi(idNum)].id = idNum;
							   					cout << "Hit! "<<cr[stoi(idNum)].id<<"\n";
							   				}
							   				if(!cr[stoi(idNum)].read)
							   				{
							   					
							   				cr[stoi(idNum)].id = outputPayload[0];
							   				cr[stoi(idNum)].read = true;
							   				cr[stoi(idNum)].rank++;
							   				cout << "Hit! "<<cr[stoi(idNum)].id<<"\n";
							   				}
							   				
							   				
							   			}
							   			
							   				emptySkip:
							   				system("");
							   		}
							   	}

							   		index--;
							}
							cout <<"\n";
							cr[stoi(dataCache.id)].rank = 0;
							int temp = 0;
							row = 2;
							for(int i = 0; i<2000;i++)
							{
								result[i] = "[EMPTY]";
							}
							for(int i = 0; i<2000;i++)
							{
								if(cr[i].rank != 0)
								{
									result[temp] = cr[i].id;
									temp++;
								}
							}
							inputBuffer = "";
							crossrefrence = true;
							goto dbListPrint;
					
										}
										if(inputBuffer == "exit")
										{
										system("clear");
											}
								}
								else
								{
									cout << "That ID is not on the list!\nPress [ENTER] to contiune.";
									pause();
									system("clear");
									goto list;
								}
							}
						}

						
int parsePayload(string file, string folder, string tag, int matchIndex)
{
string normalCrypt(string toEncrypt);
int counter = 0;
string readBuffer;
string dataArray[5000] = "EMPTY";
string path = folder + file;
int startPoint = 0;
int point = 0;
int endPoint = 0;
bool encryption = true;
bool reached = false;



	fstream searchFile (path.c_str(), ios::in);
	if(searchFile.is_open())
	{
		int index = 0;

			while (getline(searchFile, readBuffer))
			{
				if(encryption)
				{
					dataArray[index] = normalCrypt(readBuffer);
				}
				else
				{
					dataArray[index] = readBuffer;
				}
				index++;
			}
		for(int index2 = 0; index2 < 500; index2++)
		{

			if(counter == matchIndex)
			{
				break;	
			}

			if(dataArray[index2] == "EMPTY")
			{
				break;
			}

			if(dataArray[index2] == tag)
			{
				
				if(reached)
				{
					endPoint = index2;
					reached = false;
					point++;
					counter++;
					goto skip;
				}
				if(!reached)
				{
				startPoint = index2;
				reached = true;
				}
				skip:
				system("");
			}

		}
		returnArray[0] = startPoint;
		returnArray[1] = endPoint;
		if(startPoint == 0)
		{
			return 5;
		}
		if(endPoint == 0)
		{
			return 5;
		}
		return 0;
		
		}
		else
		{
			return 1;
		}

		}

int getpayload(string file, string folder)
{
	
	for(int i = 0; i < 199; i++)
	{
		outputPayload[i] = "[EMPTY]";
	}

	int lines[2] = { returnArray[0], returnArray[1] };
	string dataArray[20000] = "[EMPTY]";
	string readBuffer;
	string path = folder + file;
	bool encryption = true;

	fstream searchFile (path.c_str(), ios::in);
	if(searchFile.is_open())
	{
		int index = 0;

			while (getline(searchFile, readBuffer))
			{
				if(encryption)
				{

					dataArray[index] = normalCrypt(readBuffer);
				}
				else
				{
					dataArray[index] = readBuffer;
				}
				index++;
			}
			int arrayIndex = 0;
			
		for(int i = lines[0] + 1; i < lines[1]; i++)
		{
			outputPayload[arrayIndex] = dataArray[i];
			arrayIndex++;

		}
		if(outputPayload[0] == "[EMPTY]")
		{
			return 4;
		}
		 return 0;
			}
			else
			{
				return 1;
			}
}

int payload(string file, string folder, string tag, int matchIndex)
{
	outputPayload[0] = "[null]";
	int getpayload(string file, string folder);
	int parseErr = parsePayload(file, folder, tag, matchIndex);
	int getErr = getpayload(file, folder);
	if(parseErr != 0)
	{
		return parseErr;
	}
	if(getErr != 0)
	{
		return getErr;
	}
	return 0;
}
