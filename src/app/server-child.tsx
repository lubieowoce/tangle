import { Card, CardProps, Text } from "./common";
import { Timestamp } from "./timestamp";

export async function ServerChild({ children, ...props }: CardProps) {
  return (
    <Card {...props}>
      <Text>
        Server child <Timestamp />
      </Text>
      {children}
    </Card>
  );
}
