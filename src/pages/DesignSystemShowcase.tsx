import {
    Button,
    Input,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Typography,
    Container,
    Stack,
    Grid,
    Box,
} from '@/design-system/components';

const DesignSystemShowcase = () => {
    return (
        <div className="min-h-screen bg-background text-foreground py-12">
            <Container size="xl">
                <Stack gap={12}>
                    {/* Header */}
                    <Box className="text-center">
                        <Typography variant="h1" className="mb-4">
                            Uber Base Design System
                        </Typography>
                        <Typography variant="bodyLarge" color="muted">
                            Component showcase demonstrating the implementation of Uber's Base Design System
                        </Typography>
                    </Box>

                    {/* Colors Section */}
                    <section>
                        <Typography variant="h2" className="mb-6">
                            Colors
                        </Typography>

                        <Stack gap={6}>
                            {/* Primary */}
                            <div>
                                <Typography variant="h4" className="mb-3">Primary</Typography>
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 bg-base-black rounded-lg flex items-center justify-center text-base-white text-xs">Black</div>
                                    <div className="w-24 h-24 bg-base-white rounded-lg border border-base-gray200 flex items-center justify-center text-base-black text-xs">White</div>
                                </div>
                            </div>

                            {/* Gray Scale */}
                            <div>
                                <Typography variant="h4" className="mb-3">Gray Scale</Typography>
                                <div className="flex flex-wrap gap-2">
                                    {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                                        <div
                                            key={shade}
                                            className={`w-16 h-16 rounded-lg flex items-center justify-center text-xs bg-base-gray${shade} ${shade < 500 ? 'text-base-gray900' : 'text-base-white'}`}
                                        >
                                            {shade}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Semantic Colors */}
                            <div>
                                <Typography variant="h4" className="mb-3">Semantic</Typography>
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 bg-base-positive rounded-lg flex items-center justify-center text-base-white text-xs">Positive</div>
                                    <div className="w-24 h-24 bg-base-negative rounded-lg flex items-center justify-center text-base-white text-xs">Negative</div>
                                    <div className="w-24 h-24 bg-base-warning rounded-lg flex items-center justify-center text-base-black text-xs">Warning</div>
                                    <div className="w-24 h-24 bg-base-accent rounded-lg flex items-center justify-center text-base-white text-xs">Accent</div>
                                </div>
                            </div>
                        </Stack>
                    </section>

                    {/* Typography Section */}
                    <section>
                        <Typography variant="h2" className="mb-6">
                            Typography
                        </Typography>

                        <Card variant="outlined">
                            <CardContent>
                                <Stack gap={4}>
                                    <div>
                                        <Typography variant="label" color="muted">Display 2</Typography>
                                        <Typography variant="display2">Display Title</Typography>
                                    </div>
                                    <div>
                                        <Typography variant="label" color="muted">H1</Typography>
                                        <Typography variant="h1">Heading 1</Typography>
                                    </div>
                                    <div>
                                        <Typography variant="label" color="muted">H2</Typography>
                                        <Typography variant="h2">Heading 2</Typography>
                                    </div>
                                    <div>
                                        <Typography variant="label" color="muted">H3</Typography>
                                        <Typography variant="h3">Heading 3</Typography>
                                    </div>
                                    <div>
                                        <Typography variant="label" color="muted">H4</Typography>
                                        <Typography variant="h4">Heading 4</Typography>
                                    </div>
                                    <div>
                                        <Typography variant="label" color="muted">Body Large</Typography>
                                        <Typography variant="bodyLarge">This is body large text for important paragraphs.</Typography>
                                    </div>
                                    <div>
                                        <Typography variant="label" color="muted">Body</Typography>
                                        <Typography variant="body">This is the default body text for general content.</Typography>
                                    </div>
                                    <div>
                                        <Typography variant="label" color="muted">Body Small</Typography>
                                        <Typography variant="bodySmall">This is small body text for secondary content.</Typography>
                                    </div>
                                    <div>
                                        <Typography variant="label" color="muted">Caption</Typography>
                                        <Typography variant="caption">This is caption text for labels and hints.</Typography>
                                    </div>
                                </Stack>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Buttons Section */}
                    <section>
                        <Typography variant="h2" className="mb-6">
                            Buttons
                        </Typography>

                        <Stack gap={8}>
                            {/* Variants */}
                            <div>
                                <Typography variant="h4" className="mb-4">Variants</Typography>
                                <Stack direction="horizontal" gap={4}>
                                    <Button variant="primary">Primary</Button>
                                    <Button variant="secondary">Secondary</Button>
                                    <Button variant="outline">Outline</Button>
                                    <Button variant="ghost">Ghost</Button>
                                    <Button variant="destructive">Destructive</Button>
                                </Stack>
                            </div>

                            {/* Sizes */}
                            <div>
                                <Typography variant="h4" className="mb-4">Sizes</Typography>
                                <Stack direction="horizontal" gap={4} align="center">
                                    <Button size="sm">Small</Button>
                                    <Button size="md">Medium</Button>
                                    <Button size="lg">Large</Button>
                                </Stack>
                            </div>

                            {/* States */}
                            <div>
                                <Typography variant="h4" className="mb-4">States</Typography>
                                <Stack direction="horizontal" gap={4}>
                                    <Button>Default</Button>
                                    <Button disabled>Disabled</Button>
                                    <Button loading>Loading</Button>
                                </Stack>
                            </div>
                        </Stack>
                    </section>

                    {/* Inputs Section */}
                    <section>
                        <Typography variant="h2" className="mb-6">
                            Inputs
                        </Typography>

                        <Grid columns={2} gap={6}>
                            <Input label="Default Input" placeholder="Enter text..." />
                            <Input label="With Helper Text" placeholder="Email address" helperText="We'll never share your email." />
                            <Input label="Error State" placeholder="Username" error="This username is already taken." />
                            <Input label="Disabled" placeholder="Cannot edit" disabled />
                        </Grid>

                        <Stack direction="horizontal" gap={4} className="mt-6">
                            <Input inputSize="sm" placeholder="Small" />
                            <Input inputSize="md" placeholder="Medium" />
                            <Input inputSize="lg" placeholder="Large" />
                        </Stack>
                    </section>

                    {/* Cards Section */}
                    <section>
                        <Typography variant="h2" className="mb-6">
                            Cards
                        </Typography>

                        <Grid columns={3} gap={6}>
                            <Card variant="default">
                                <CardHeader>
                                    <CardTitle>Default Card</CardTitle>
                                    <CardDescription>Basic card with no shadow</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Typography variant="body">Content goes here. This is a default card variant.</Typography>
                                </CardContent>
                                <CardFooter>
                                    <Button size="sm" variant="ghost">Cancel</Button>
                                    <Button size="sm">Confirm</Button>
                                </CardFooter>
                            </Card>

                            <Card variant="elevated">
                                <CardHeader>
                                    <CardTitle>Elevated Card</CardTitle>
                                    <CardDescription>Card with shadow and hover effect</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Typography variant="body">This card has elevation and lifts on hover.</Typography>
                                </CardContent>
                                <CardFooter>
                                    <Button size="sm" variant="outline">Learn More</Button>
                                </CardFooter>
                            </Card>

                            <Card variant="outlined">
                                <CardHeader>
                                    <CardTitle>Outlined Card</CardTitle>
                                    <CardDescription>Card with border only</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Typography variant="body">This card uses a border instead of shadow.</Typography>
                                </CardContent>
                                <CardFooter>
                                    <Button size="sm" variant="secondary">Action</Button>
                                </CardFooter>
                            </Card>
                        </Grid>
                    </section>

                    {/* Spacing Demo */}
                    <section>
                        <Typography variant="h2" className="mb-6">
                            Spacing Scale
                        </Typography>

                        <div className="flex flex-wrap items-end gap-4">
                            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((space) => (
                                <div key={space} className="flex flex-col items-center gap-2">
                                    <div
                                        className="bg-base-accent"
                                        style={{ width: `${space * 4}px`, height: `${space * 4}px` }}
                                    />
                                    <Typography variant="caption">{space * 4}px</Typography>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Shadows Demo */}
                    <section>
                        <Typography variant="h2" className="mb-6">
                            Shadows & Elevation
                        </Typography>

                        <div className="flex gap-8 items-center bg-base-gray100 dark:bg-base-gray800 p-8 rounded-lg">
                            <div className="w-24 h-24 bg-base-white dark:bg-base-gray700 rounded-lg flex items-center justify-center text-xs shadow-base-sm">SM</div>
                            <div className="w-24 h-24 bg-base-white dark:bg-base-gray700 rounded-lg flex items-center justify-center text-xs shadow-base">Base</div>
                            <div className="w-24 h-24 bg-base-white dark:bg-base-gray700 rounded-lg flex items-center justify-center text-xs shadow-base-md">MD</div>
                            <div className="w-24 h-24 bg-base-white dark:bg-base-gray700 rounded-lg flex items-center justify-center text-xs shadow-base-lg">LG</div>
                            <div className="w-24 h-24 bg-base-white dark:bg-base-gray700 rounded-lg flex items-center justify-center text-xs shadow-base-xl">XL</div>
                            <div className="w-24 h-24 bg-base-white dark:bg-base-gray700 rounded-lg flex items-center justify-center text-xs shadow-base-2xl">2XL</div>
                        </div>
                    </section>

                    {/* Border Radius Demo */}
                    <section>
                        <Typography variant="h2" className="mb-6">
                            Border Radius
                        </Typography>

                        <div className="flex gap-6 items-center">
                            <div className="w-20 h-20 bg-base-accent rounded-none flex items-center justify-center text-base-white text-xs">None</div>
                            <div className="w-20 h-20 bg-base-accent rounded-sm flex items-center justify-center text-base-white text-xs">SM</div>
                            <div className="w-20 h-20 bg-base-accent rounded-base flex items-center justify-center text-base-white text-xs">Base</div>
                            <div className="w-20 h-20 bg-base-accent rounded-md flex items-center justify-center text-base-white text-xs">MD</div>
                            <div className="w-20 h-20 bg-base-accent rounded-lg flex items-center justify-center text-base-white text-xs">LG</div>
                            <div className="w-20 h-20 bg-base-accent rounded-xl flex items-center justify-center text-base-white text-xs">XL</div>
                            <div className="w-20 h-20 bg-base-accent rounded-2xl flex items-center justify-center text-base-white text-xs">2XL</div>
                            <div className="w-20 h-20 bg-base-accent rounded-full flex items-center justify-center text-base-white text-xs">Full</div>
                        </div>
                    </section>

                </Stack>
            </Container>
        </div>
    );
};

export default DesignSystemShowcase;
