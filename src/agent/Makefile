CC = gcc
CFLAGS = -O2 -Wall
LDFLAGS = -s -Wl,--gc-sections

all: native-agent

native-agent: native_edge_agent.c
	$(CC) $(CFLAGS) -o native-agent native_edge_agent.c $(LDFLAGS)

clean:
	rm -f native-agent
